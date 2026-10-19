<?php

namespace Tests\Feature;

use App\Models\ClientAccount;
use App\Models\GlAccount;
use App\Models\InterestExemption;
use App\Models\InterestPolicy;
use App\Models\Supplier;
use App\Models\SupplierBill;
use App\Models\User;
use App\Services\BranchAccessService;
use App\Services\GeneralLedgerService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountingOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->admin = User::query()->where('email', 'test@example.com')->firstOrFail();
    }

    public function test_cash_movement_traces_posted_cash_in_and_cash_out(): void
    {
        $accounts = GlAccount::query()->where('organization_id', $this->admin->organization_id)
            ->whereIn('system_key', ['bank', 'operating_expense'])->pluck('id', 'system_key');
        $journal = app(GeneralLedgerService::class)->createSystemJournal(
            $this->admin->organization_id,
            $this->admin->home_branch_id,
            $this->admin->id,
            [
                'entry_date' => today()->toDateString(),
                'journal_type' => 'cash_disbursement',
                'reference' => 'TEST-CASH-OUT',
                'description' => 'Test operating cash expense',
                'currency_code' => 'USD',
                'lines' => [
                    ['gl_account_id' => $accounts['operating_expense'], 'debit' => 25, 'credit' => 0],
                    ['gl_account_id' => $accounts['bank'], 'debit' => 0, 'credit' => 25],
                ],
            ],
        );
        $this->assertNotNull($journal);
        $this->assertSame('posted', $journal->status);
        $this->assertEqualsWithDelta(25, (float) $journal->lines->sum('base_credit'), 0.0001);

        $cashMovement = app(GeneralLedgerService::class)->cashMovement(
            $this->admin,
            today()->startOfYear()->toDateString(),
            today()->toDateString(),
            null,
        );
        $this->assertGreaterThan(0, $cashMovement['summary']['cash_out']);

        $this->actingAs($this->admin)
            ->withSession([BranchAccessService::SESSION_KEY => $this->admin->home_branch_id])
            ->get('/accounting/cash-movement?from='.today()->startOfYear()->toDateString().'&to='.today()->toDateString())
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('accounting/cash-movement')
                ->where('summary.cash_in', fn (float $value): bool => $value > 0)
                ->where('summary.cash_out', fn (float $value): bool => $value > 0)
                ->has('movements.0', fn (Assert $row) => $row->hasAll(['journal_no', 'source', 'running_balance'])->etc())
                ->has('monthly'));
    }

    public function test_supplier_payables_support_the_requested_180_plus_ageing_bucket(): void
    {
        $seeded180Plus = SupplierBill::query()
            ->where('organization_id', $this->admin->organization_id)
            ->whereIn('status', ['posted', 'partially_paid', 'overdue'])
            ->whereDate('due_date', '<=', today()->subDays(180))
            ->get()
            ->sum(fn (SupplierBill $bill): float => (float) $bill->total_amount - (float) $bill->paid_amount);
        $supplier = Supplier::query()->create([
            'organization_id' => $this->admin->organization_id,
            'supplier_no' => 'SUP-AGE-001',
            'name' => 'Legacy Creditor',
            'currency_code' => 'USD',
            'payment_terms_days' => 30,
            'status' => 'active',
        ]);
        SupplierBill::query()->create([
            'organization_id' => $this->admin->organization_id,
            'branch_id' => $this->admin->home_branch_id,
            'supplier_id' => $supplier->id,
            'bill_no' => 'BILL-AGE-001',
            'bill_date' => today()->subDays(230),
            'due_date' => today()->subDays(200),
            'currency_code' => 'USD',
            'subtotal' => 900,
            'tax_amount' => 0,
            'total_amount' => 900,
            'paid_amount' => 100,
            'status' => 'partially_paid',
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->withSession([BranchAccessService::SESSION_KEY => $this->admin->home_branch_id])
            ->get('/accounting/payables?bucket=180-plus&search=Legacy+Creditor')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('accounting/payables')
                ->where('filters.bucket', '180-plus')
                ->where('ageing.6.key', '180-plus')
                ->where('ageing.6.total', fn ($value): bool => (float) $value === $seeded180Plus + 800.0)
                ->has('bills.data', 1)
                ->where('bills.data.0.bill_no', 'BILL-AGE-001')
                ->where('bills.data.0.days_outstanding', 200));
    }

    public function test_interest_policy_and_account_exemptions_are_auditable(): void
    {
        $account = ClientAccount::query()->where('status', 'open')->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $this->actingAs($this->admin)->withSession($session)->patch('/accounting/interest-policy', [
            'name' => 'Board approved policy',
            'base_annual_rate' => 15,
            'grace_days' => 30,
            'merit_window_months' => 6,
            'merit_exemption_threshold' => 95,
            'merit_discount_threshold' => 80,
            'discounted_annual_rate' => 7.5,
            'minimum_overdue_balance' => 50,
            'active' => true,
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('interest_policies', [
            'organization_id' => $this->admin->organization_id,
            'name' => 'Board approved policy',
            'base_annual_rate' => 15,
        ]);

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/interest-exemptions', [
            'client_account_id' => $account->id,
            'starts_on' => today()->toDateString(),
            'ends_on' => today()->addMonths(3)->toDateString(),
            'rate_override' => 0,
            'reason' => 'Consistent payment performance approved by finance management.',
        ])->assertRedirect()->assertSessionHas('success');

        $exemption = InterestExemption::query()->where('client_account_id', $account->id)->sole();
        $this->assertSame('active', $exemption->status);
        $this->assertSame($this->admin->id, $exemption->approved_by);

        $this->actingAs($this->admin)->withSession($session)->get('/accounting/interest-review')
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('accounting/interest-review')
            ->where('policy.name', 'Board approved policy')
            ->has('summary')
            ->has('assessments')
            ->has('accountOptions'));

        $this->actingAs($this->admin)->withSession($session)->delete("/accounting/interest-exemptions/{$exemption->id}")
            ->assertRedirect();
        $this->assertSame('revoked', $exemption->fresh()->status);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'accounting.interest-exemption-revoked']);
        $this->assertSame('Board approved policy', InterestPolicy::query()->where('organization_id', $this->admin->organization_id)->value('name'));
    }
}
