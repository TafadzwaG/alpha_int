<?php

namespace Tests\Feature;

use App\Models\AccountingBudget;
use App\Models\AccountingPeriod;
use App\Models\BankAccount;
use App\Models\CatalogItem;
use App\Models\ClientAccount;
use App\Models\GlAccount;
use App\Models\InventoryMovement;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\AccountingControlService;
use App\Services\BranchAccessService;
use App\Services\GeneralLedgerService;
use App\Services\SalesLifecycleService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountingControlCentreTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_eight_accounting_control_areas_work_as_one_posting_system(): void
    {
        $this->seed(DatabaseSeeder::class);
        $maker = User::query()->where('email', 'test@example.com')->firstOrFail();
        $checker = User::factory()->create(['organization_id' => $maker->organization_id, 'home_branch_id' => $maker->home_branch_id]);
        $approver = User::factory()->create(['organization_id' => $maker->organization_id, 'home_branch_id' => $maker->home_branch_id]);
        $session = [BranchAccessService::SESSION_KEY => $maker->home_branch_id];

        $this->actingAs($maker)->withSession($session)->get('/accounting/control-centre')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('accounting/control-centre')
            ->hasAll(['salesDocuments', 'bankReconciliations', 'inventoryControls', 'vatReturns', 'closes', 'dimensions', 'budgets', 'approvalLimits'])
            ->has('options.inventoryItems'));

        $sales = app(SalesLifecycleService::class);
        $item = CatalogItem::query()->where('organization_id', $maker->organization_id)->where('status', 'active')->firstOrFail();
        $account = ClientAccount::query()->whereHas('clientFile.client', fn ($query) => $query->where('organization_id', $maker->organization_id))->firstOrFail();
        $payload = [
            'branch_id' => $maker->home_branch_id, 'client_account_id' => $account->id, 'document_type' => 'quotation',
            'document_date' => today()->toDateString(), 'due_date' => today()->addDays(30)->toDateString(), 'currency_code' => 'USD',
            'document_discount_rate' => 5, 'description' => 'Controlled lifecycle test', 'is_recurring' => false,
            'lines' => [['catalog_item_id' => $item->id, 'description' => $item->name, 'quantity' => 1, 'unit_price' => 100, 'discount_rate' => 10]],
        ];
        $quote = $sales->create($maker, $payload);
        $sales->submit($quote, $maker);
        $this->expectValidationException(fn () => $sales->approve($quote->fresh(), $maker));
        $sales->approve($quote->fresh(), $checker);
        $order = $sales->convert($quote->fresh(), $maker, 'sales_order');
        $this->assertSame('sales_order', $order->document_type);
        $this->assertSame('converted', $quote->fresh()->status);

        $invoice = $sales->create($maker, [...$payload, 'document_type' => 'invoice']);
        $sales->submit($invoice, $maker);
        $sales->approve($invoice->fresh(), $checker);
        $sales->post($invoice->fresh(), $approver);
        $invoice->refresh();
        $this->assertSame('posted', $invoice->status);
        $this->assertNotNull($invoice->journal_entry_id);
        $this->assertNotNull($invoice->account_charge_id);
        $this->assertNotNull(JournalEntry::query()->findOrFail($invoice->journal_entry_id)->locked_at);

        $controls = app(AccountingControlService::class);
        $bank = BankAccount::query()->where('organization_id', $maker->organization_id)->firstOrFail();
        $bankLedgerAccount = $bank->gl_account_id ?: GlAccount::query()->where('organization_id', $maker->organization_id)->where('system_key', 'bank')->value('id');
        $ledgerBalance = (float) DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_entries.organization_id', $maker->organization_id)->where('journal_entries.status', 'posted')
            ->where('journal_lines.gl_account_id', $bankLedgerAccount)->whereDate('journal_entries.entry_date', '<=', today())
            ->selectRaw('COALESCE(SUM(journal_lines.base_debit - journal_lines.base_credit), 0) balance')->value('balance');
        $reconciliation = $controls->createBankReconciliation($maker, [
            'bank_account_id' => $bank->id, 'reference' => 'REC-INTEGRATION-001', 'from_date' => today()->startOfMonth()->toDateString(),
            'to_date' => today()->toDateString(), 'opening_statement_balance' => 0, 'closing_statement_balance' => $ledgerBalance,
        ]);
        $this->expectValidationException(fn () => $controls->reviewBankReconciliation($reconciliation, $maker, 'Self review'));
        $controls->reviewBankReconciliation($reconciliation->fresh(), $checker, 'Ledger agrees to statement.');
        $controls->approveBankReconciliation($reconciliation->fresh(), $approver);
        $this->assertSame('signed_off', $reconciliation->fresh()->status);

        $stockItem = CatalogItem::query()->where('organization_id', $maker->organization_id)->where('track_inventory', true)->firstOrFail();
        $quantity = (float) InventoryMovement::query()->where('branch_id', $maker->home_branch_id)->where('catalog_item_id', $stockItem->id)->sum('quantity');
        $variance = GlAccount::query()->where('organization_id', $maker->organization_id)->where('system_key', 'cost_of_sales')->firstOrFail();
        $control = $controls->createInventoryControl($maker, [
            'branch_id' => $maker->home_branch_id, 'control_type' => 'stock_count', 'control_date' => today()->toDateString(),
            'reason' => 'Verified physical count', 'lines' => [['catalog_item_id' => $stockItem->id, 'counted_quantity' => $quantity + 2, 'unit_cost' => 10, 'counter_account_id' => $variance->id]],
        ]);
        $this->expectValidationException(fn () => $controls->approveInventoryControl($control, $maker));
        $controls->approveInventoryControl($control->fresh(), $checker);
        $controls->postInventoryControl($control->fresh(), $approver);
        $this->assertSame('posted', $control->fresh()->status);
        $this->assertEqualsWithDelta($quantity + 2, (float) InventoryMovement::query()->where('branch_id', $maker->home_branch_id)->where('catalog_item_id', $stockItem->id)->sum('quantity'), 0.0001);

        $vat = $controls->prepareVatReturn($maker, ['from_date' => today()->startOfMonth()->toDateString(), 'to_date' => today()->toDateString(), 'currency_code' => 'USD']);
        $vat->forceFill(['variance' => 0])->save();
        $controls->transitionVatReturn($vat->fresh(), $checker, 'reviewed');
        $controls->transitionVatReturn($vat->fresh(), $approver, 'approved');
        $controls->transitionVatReturn($vat->fresh(), $approver, 'submitted');
        $this->assertSame('submitted', $vat->fresh()->status);
        $this->assertSame('tax_locked', AccountingPeriod::query()->whereDate('starts_on', '<=', today())->whereDate('ends_on', '>=', today())->value('status'));

        $this->assertGreaterThan(0, AccountingBudget::query()->where('organization_id', $maker->organization_id)->count());
        foreach (['cash-flow', 'comparative-income', 'monthly-performance', 'budget-variance', 'control-reconciliation'] as $report) {
            $result = app(GeneralLedgerService::class)->report($maker, $report, today()->startOfYear()->toDateString(), today()->toDateString(), null);
            $this->assertSame($report, $result['type']);
            $this->assertArrayHasKey('summary', $result);
        }
    }

    private function expectValidationException(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Expected a validation exception.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }
    }
}
