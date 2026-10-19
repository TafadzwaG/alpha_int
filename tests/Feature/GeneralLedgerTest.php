<?php

namespace Tests\Feature;

use App\Models\AccountCharge;
use App\Models\AccountingPeriod;
use App\Models\ApprovalRequest;
use App\Models\Branch;
use App\Models\CatalogItem;
use App\Models\GlAccount;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentReversal;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\SupplierBill;
use App\Models\TaxCode;
use App\Models\User;
use App\Models\UserBranchAccess;
use App\Services\BranchAccessService;
use App\Services\GeneralLedgerService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GeneralLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->admin = User::query()->where('email', 'test@example.com')->firstOrFail();
    }

    public function test_operational_source_documents_are_posted_as_balanced_general_ledger_journals(): void
    {
        $journals = JournalEntry::query()->where('organization_id', $this->admin->organization_id)->where('status', 'posted')->with('lines')->get();

        $this->assertGreaterThan(0, $journals->count());
        $journals->each(function (JournalEntry $journal): void {
            $this->assertEqualsWithDelta((float) $journal->lines->sum('base_debit'), (float) $journal->lines->sum('base_credit'), 0.0001);
        });
        $this->assertTrue($journals->contains(fn (JournalEntry $journal) => $journal->journal_type === 'sales'));
        $this->assertTrue($journals->contains(fn (JournalEntry $journal) => $journal->journal_type === 'cash_receipt'));
        $this->assertTrue($journals->contains(fn (JournalEntry $journal) => $journal->journal_type === 'expense'));
        $expenseJournal = $journals->firstWhere('journal_type', 'expense');
        $this->assertTrue($expenseJournal->lines->contains(fn ($line) => $line->credit > 0
            && $line->account?->system_key === 'accounts_payable'));
    }

    public function test_reversing_a_source_payment_creates_one_opposing_journal(): void
    {
        $payment = Payment::query()->where('status', 'approved')->firstOrFail();
        $sourceJournal = JournalEntry::query()->where('source_type', Payment::class)->where('source_id', $payment->id)->firstOrFail();
        $journalCount = JournalEntry::query()->count();

        $payment->forceFill(['status' => 'reversed'])->save();

        $this->assertSame('reversed', $sourceJournal->fresh()->status);
        $this->assertDatabaseCount('journal_entries', $journalCount + 1);
        $reversal = JournalEntry::query()->where('reversal_of_id', $sourceJournal->id)->with('lines')->sole();
        $this->assertEqualsWithDelta((float) $sourceJournal->lines()->sum('base_debit'), (float) $reversal->lines->sum('base_credit'), 0.0001);

        $payment->save();
        $this->assertSame(1, JournalEntry::query()->where('reversal_of_id', $sourceJournal->id)->count());
    }

    public function test_payment_reversal_requires_a_reason_and_an_independent_approver(): void
    {
        $payment = Payment::query()->where('status', 'approved')->whereHas('allocations')->firstOrFail();
        $charge = AccountCharge::query()->whereHas('paymentAllocations', fn ($query) => $query->where('payment_id', $payment->id))->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $payment->branch_id];

        $this->actingAs($this->admin)->withSession($session)
            ->post("/administration/payments/{$payment->id}/reversals", ['reason' => 'Duplicate customer payment captured by the cashier.'])
            ->assertRedirect()->assertSessionHas('success');

        $reversal = PaymentReversal::query()->where('payment_id', $payment->id)->firstOrFail();
        $approval = ApprovalRequest::query()->findOrFail($reversal->approval_request_id);
        $this->assertSame('approved', $payment->fresh()->status);
        $this->assertSame('pending', $approval->status);

        $this->actingAs($this->admin)->withSession($session)
            ->post("/approvals/{$approval->id}/decision", ['action' => 'approve', 'note' => 'Checked against bank statement.'])
            ->assertStatus(422);

        $approver = User::factory()->create([
            'organization_id' => $this->admin->organization_id,
            'home_branch_id' => $payment->branch_id,
            'email' => 'independent.approver@alphaland.test',
        ]);
        setPermissionsTeamId($this->admin->organization_id);
        $approver->assignRole(Role::query()->where('organization_id', $this->admin->organization_id)->where('code', 'SUPER_ADMIN')->firstOrFail());

        $this->actingAs($approver)->withSession($session)
            ->post("/approvals/{$approval->id}/decision", ['action' => 'approve', 'note' => 'Checked against bank statement.'])
            ->assertRedirect()->assertSessionHas('success');

        $this->assertSame('reversed', $payment->fresh()->status);
        $this->assertSame('completed', $reversal->fresh()->status);
        $this->assertNotNull($reversal->fresh()->reversal_receipt_no);
        $this->assertSame('posted', $charge->fresh()->status);
        $this->assertDatabaseHas('journal_entries', ['reversal_of_id' => JournalEntry::query()->where('source_type', Payment::class)->where('source_id', $payment->id)->whereNull('reversal_of_id')->value('id')]);
    }

    public function test_accounting_workspaces_render_with_branch_scoped_data(): void
    {
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $this->actingAs($this->admin)->withSession($session)->get('/accounting/payables')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('accounting/payables')->has('summary')->has('suppliers')->has('bills.data'));
        $this->actingAs($this->admin)->withSession($session)->get('/accounting/settings')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('accounting/settings')
            ->has('fiscalYears', 1)
            ->has('taxCodes', 2)
            ->has('currencies')
            ->where('accountingSettings.base_currency_code', 'USD')
            ->where('accountingSettings.default_tax_code', 'VAT15'));
        $this->actingAs($this->admin)->withSession($session)->get('/accounting/financial-reports?report=income-statement')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('accounting/reports')->where('report.type', 'income-statement')->has('report.summary'));

        $excel = $this->actingAs($this->admin)->withSession($session)->get('/accounting/financial-reports/export/excel?report=trial-balance');
        $excel->assertOk();
        $this->assertStringContainsString('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', (string) $excel->headers->get('content-type'));

        $pdf = $this->actingAs($this->admin)->withSession($session)->get('/accounting/financial-reports/export/pdf?report=income-statement');
        $pdf->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $pdf->headers->get('content-type'));
    }

    public function test_financial_reports_are_limited_to_the_accountants_assigned_branches(): void
    {
        $branch = Branch::query()->where('organization_id', $this->admin->organization_id)->where('code', 'NORTH')->firstOrFail();
        $officer = User::factory()->create([
            'organization_id' => $this->admin->organization_id,
            'home_branch_id' => $branch->id,
            'email' => 'ledger.north@alphaland.test',
        ]);
        setPermissionsTeamId($this->admin->organization_id);
        $officer->assignRole(Role::query()->where('organization_id', $this->admin->organization_id)->where('code', 'ACCOUNTS_OFFICER')->firstOrFail());
        UserBranchAccess::query()->create(['user_id' => $officer->id, 'branch_id' => $branch->id, 'access_level' => 'accounts', 'active' => true]);

        $report = app(GeneralLedgerService::class)->report($officer, 'trial-balance', today()->startOfYear()->toDateString(), today()->toDateString(), null);
        $expectedDebits = (float) DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
            ->where('journal_entries.organization_id', $this->admin->organization_id)
            ->where('journal_entries.branch_id', $branch->id)
            ->where('journal_entries.status', 'posted')
            ->whereDate('journal_entries.entry_date', '<=', today())
            ->where('gl_accounts.active', true)
            ->sum('journal_lines.base_debit');

        $this->assertEqualsWithDelta($expectedDebits, $report['summary']['debits'], 0.0001);
    }

    public function test_accountant_can_create_post_reverse_and_report_a_manual_journal(): void
    {
        $accounts = GlAccount::query()->where('organization_id', $this->admin->organization_id)->whereIn('system_key', ['bank_charges', 'bank'])->pluck('id', 'system_key');
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $this->actingAs($this->admin)->withSession($session)->get('/accounting/general-ledger')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('accounting/general-ledger')->has('accounts')->has('journals.data'));

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/journals', [
            'branch_id' => $this->admin->home_branch_id,
            'entry_date' => today()->toDateString(),
            'journal_type' => 'general',
            'reference' => 'BANK-FEE-001',
            'description' => 'Monthly bank fee',
            'currency_code' => 'USD',
            'exchange_rate' => 1,
            'lines' => [
                ['gl_account_id' => $accounts['bank_charges'], 'debit' => 25, 'credit' => 0],
                ['gl_account_id' => $accounts['bank'], 'debit' => 0, 'credit' => 25],
            ],
        ])->assertRedirect()->assertSessionHas('success');

        $journal = JournalEntry::query()->where('reference', 'BANK-FEE-001')->firstOrFail();
        $this->assertSame('draft', $journal->status);
        $this->actingAs($this->admin)->withSession($session)->post("/accounting/journals/{$journal->id}/post")->assertRedirect();
        $this->assertSame('posted', $journal->fresh()->status);

        $this->actingAs($this->admin)->withSession($session)->get('/accounting/financial-reports?report=trial-balance')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('accounting/reports')->where('report.type', 'trial-balance')->has('report.rows'));

        $this->actingAs($this->admin)->withSession($session)->post("/accounting/journals/{$journal->id}/reverse", ['reason' => 'Duplicate bank notification'])->assertRedirect();
        $this->assertSame('reversed', $journal->fresh()->status);
        $this->assertDatabaseHas('journal_entries', ['reversal_of_id' => $journal->id, 'status' => 'posted', 'journal_type' => 'reversal']);
    }

    public function test_unbalanced_journal_and_closed_period_postings_are_rejected(): void
    {
        $accounts = GlAccount::query()->where('organization_id', $this->admin->organization_id)->where('allow_manual_posting', true)->limit(2)->pluck('id');
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];
        $payload = [
            'branch_id' => $this->admin->home_branch_id, 'entry_date' => today()->toDateString(), 'journal_type' => 'general',
            'description' => 'Control validation', 'currency_code' => 'USD', 'exchange_rate' => 1,
            'lines' => [['gl_account_id' => $accounts[0], 'debit' => 100, 'credit' => 0], ['gl_account_id' => $accounts[1], 'debit' => 0, 'credit' => 90]],
        ];
        $this->actingAs($this->admin)->withSession($session)->post('/accounting/journals', $payload)->assertSessionHasErrors('lines');

        $period = AccountingPeriod::query()->whereDate('starts_on', '<=', today())->whereDate('ends_on', '>=', today())->firstOrFail();
        $this->actingAs($this->admin)->withSession($session)->patch("/accounting/periods/{$period->id}", ['status' => 'closed'])->assertRedirect();
        $payload['lines'][1]['credit'] = 100;
        $this->actingAs($this->admin)->withSession($session)->post('/accounting/journals', $payload)->assertSessionHasErrors('entry_date');
    }

    public function test_accounting_controls_and_tax_codes_can_be_updated(): void
    {
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $this->actingAs($this->admin)->withSession($session)->patch('/accounting/settings', [
            'base_currency_code' => 'ZWG',
            'fiscal_year_start_month' => 7,
            'default_tax_code' => 'ZERO',
            'default_payment_terms_days' => 45,
            'journal_prefix' => 'AL-JRN',
            'source_posting_mode' => 'manual',
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertSame('ZWG', $this->admin->organization->fresh()->base_currency_code);
        $this->assertDatabaseHas('system_settings', [
            'organization_id' => $this->admin->organization_id,
            'setting_key' => 'accounting.control',
            'effective_to' => null,
        ]);

        $taxCode = TaxCode::query()->where('organization_id', $this->admin->organization_id)->where('code', 'ZERO')->firstOrFail();
        $this->actingAs($this->admin)->withSession($session)->patch("/accounting/tax-codes/{$taxCode->id}", [
            'code' => 'ZERO',
            'name' => 'Zero-rated supplies',
            'rate' => 0,
            'type' => 'zero',
            'input_account_id' => null,
            'output_account_id' => null,
            'active' => false,
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('tax_codes', ['id' => $taxCode->id, 'name' => 'Zero-rated supplies', 'active' => false]);
    }

    public function test_supplier_bill_posts_to_payables_and_can_be_paid(): void
    {
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];
        $this->actingAs($this->admin)->withSession($session)->post('/accounting/suppliers', [
            'name' => 'Survey Services Zimbabwe', 'tax_number' => 'VAT-001', 'email' => 'accounts@survey.test',
            'currency_code' => 'USD', 'payment_terms_days' => 30,
        ])->assertRedirect();
        $supplier = Supplier::query()->where('name', 'Survey Services Zimbabwe')->firstOrFail();
        $expenseAccount = GlAccount::query()->where('organization_id', $this->admin->organization_id)->where('system_key', 'operating_expense')->firstOrFail();
        $this->actingAs($this->admin)->withSession($session)->post('/accounting/supplier-bills', [
            'supplier_id' => $supplier->id, 'branch_id' => $this->admin->home_branch_id, 'supplier_reference' => 'SSZ-1001',
            'bill_date' => today()->toDateString(), 'due_date' => today()->addDays(30)->toDateString(), 'currency_code' => 'USD', 'description' => 'Survey work',
            'lines' => [['gl_account_id' => $expenseAccount->id, 'description' => 'Topographical survey', 'quantity' => 1, 'unit_price' => 1000, 'tax_code' => 'VAT15']],
        ])->assertRedirect();
        $bill = SupplierBill::query()->where('supplier_reference', 'SSZ-1001')->firstOrFail();
        $this->assertEquals(1150, (float) $bill->total_amount);

        $this->actingAs($this->admin)->withSession($session)->post("/accounting/supplier-bills/{$bill->id}/post")->assertRedirect();
        $this->assertSame('posted', $bill->fresh()->status);
        $this->assertNotNull($bill->fresh()->journal_entry_id);

        $this->actingAs($this->admin)->withSession($session)->post("/accounting/supplier-bills/{$bill->id}/payments", [
            'amount' => 1150, 'payment_date' => today()->toDateString(), 'reference' => 'EFT-SSZ-1001',
        ])->assertRedirect();
        $this->assertSame('paid', $bill->fresh()->status);
        $this->assertEquals(1150, (float) $bill->fresh()->paid_amount);
        $this->assertDatabaseHas('supplier_payments', ['supplier_bill_id' => $bill->id, 'reference' => 'EFT-SSZ-1001']);
    }

    public function test_supplier_master_validates_identity_contact_currency_and_terms(): void
    {
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/suppliers', [
            'name' => 'A',
            'tax_number' => '@invalid',
            'email' => 'not-an-email',
            'phone' => 'abc',
            'address' => str_repeat('x', 1001),
            'currency_code' => 'usd',
            'payment_terms_days' => 366,
        ])->assertSessionHasErrors([
            'name', 'tax_number', 'email', 'phone', 'address', 'currency_code', 'payment_terms_days',
        ]);

        $validSupplier = [
            'name' => 'Validated Supplier',
            'tax_number' => 'VAT-VALID-001',
            'email' => 'accounts@validated-supplier.test',
            'phone' => '+263 24 2000000',
            'address' => '1 Supplier Avenue, Harare',
            'currency_code' => 'USD',
            'payment_terms_days' => 30,
        ];
        $this->actingAs($this->admin)->withSession($session)->post('/accounting/suppliers', $validSupplier)
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/suppliers', [
            ...$validSupplier,
            'name' => 'Duplicate Supplier',
        ])->assertSessionHasErrors(['tax_number', 'email']);
    }

    public function test_supplier_master_supports_profile_updates_archiving_and_export(): void
    {
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];
        $supplier = Supplier::query()->where('organization_id', $this->admin->organization_id)->whereDoesntHave('bills', fn ($query) => $query->where('status', 'draft'))->firstOrFail();

        $this->actingAs($this->admin)->withSession($session)->get("/accounting/suppliers/{$supplier->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('accounting/supplier-show')->where('supplier.id', $supplier->id)->has('supplier.summary')->has('bills.data'));

        $this->actingAs($this->admin)->withSession($session)->put("/accounting/suppliers/{$supplier->id}", [
            'name' => 'Updated Supplier Name',
            'tax_number' => $supplier->tax_number,
            'email' => $supplier->email,
            'phone' => '+263 77 9990000',
            'address' => 'Updated supplier address',
            'currency_code' => 'USD',
            'payment_terms_days' => 45,
        ])->assertRedirect()->assertSessionHas('success');
        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'name' => 'Updated Supplier Name', 'payment_terms_days' => 45]);

        $this->actingAs($this->admin)->withSession($session)->patch("/accounting/suppliers/{$supplier->id}/status", ['status' => 'inactive'])
            ->assertRedirect()->assertSessionHas('success');
        $this->assertSame('inactive', $supplier->fresh()->status);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'accounting.supplier-status-changed', 'subject_id' => $supplier->id]);

        $this->actingAs($this->admin)->withSession($session)->get('/accounting/suppliers/export')
            ->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_product_and_service_master_data_can_drive_supplier_bill_lines(): void
    {
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];
        $supplier = Supplier::query()->where('organization_id', $this->admin->organization_id)->where('status', 'active')->firstOrFail();
        $expenseAccount = GlAccount::query()->where('organization_id', $this->admin->organization_id)->where('system_key', 'operating_expense')->firstOrFail();
        $taxCode = TaxCode::query()->where('organization_id', $this->admin->organization_id)->where('code', 'VAT15')->firstOrFail();

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/catalog-items', [
            'code' => 'SRV-VALUATION',
            'name' => 'Property valuation',
            'description' => 'Professional property valuation service',
            'type' => 'service',
            'unit_of_measure' => 'report',
            'default_unit_price' => 500,
            'currency_code' => 'USD',
            'default_supplier_id' => $supplier->id,
            'expense_account_id' => $expenseAccount->id,
            'tax_code_id' => $taxCode->id,
        ])->assertRedirect()->assertSessionHas('success');
        $item = CatalogItem::query()->where('code', 'SRV-VALUATION')->firstOrFail();

        $this->actingAs($this->admin)->withSession($session)->get('/accounting/master-data')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('accounting/master-data')->has('summary')->has('items.data')->has('suppliers'));

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/supplier-bills', [
            'supplier_id' => $supplier->id,
            'branch_id' => $this->admin->home_branch_id,
            'supplier_reference' => 'CATALOG-001',
            'bill_date' => today()->toDateString(),
            'due_date' => today()->addDays(30)->toDateString(),
            'currency_code' => 'USD',
            'description' => 'Valuation report',
            'lines' => [[
                'catalog_item_id' => $item->id,
                'gl_account_id' => $expenseAccount->id,
                'description' => $item->name,
                'quantity' => 2,
                'unit_price' => 500,
                'tax_code' => 'VAT15',
            ]],
        ])->assertRedirect()->assertSessionHas('success');
        $bill = SupplierBill::query()->where('supplier_reference', 'CATALOG-001')->firstOrFail();
        $this->assertSame($item->id, $bill->lines()->value('catalog_item_id'));
        $this->assertEquals(1150, (float) $bill->total_amount);

        $this->actingAs($this->admin)->withSession($session)->put("/accounting/catalog-items/{$item->id}", [
            'code' => 'SRV-VALUATION', 'name' => 'Property valuation report', 'description' => null, 'type' => 'service',
            'unit_of_measure' => 'report', 'default_unit_price' => 575, 'currency_code' => 'USD',
            'default_supplier_id' => $supplier->id, 'expense_account_id' => $expenseAccount->id, 'tax_code_id' => $taxCode->id,
        ])->assertRedirect();
        $this->assertDatabaseHas('catalog_items', ['id' => $item->id, 'name' => 'Property valuation report']);

        $this->actingAs($this->admin)->withSession($session)->patch("/accounting/catalog-items/{$item->id}/status", ['status' => 'inactive'])->assertRedirect();
        $this->assertSame('inactive', $item->fresh()->status);
    }
}
