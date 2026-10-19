<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\BankDeposit;
use App\Models\BankStatementLine;
use App\Models\CatalogItem;
use App\Models\ClientAccount;
use App\Models\CustomerInvoice;
use App\Models\GlAccount;
use App\Models\InventoryMovement;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierBill;
use App\Models\User;
use App\Services\BranchAccessService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DailyAccountingActivityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->admin = User::query()->where('email', 'test@example.com')->firstOrFail();
    }

    public function test_daily_activity_workspace_exposes_all_connected_source_document_registers(): void
    {
        $this->actingAs($this->admin)->withSession([BranchAccessService::SESSION_KEY => $this->admin->home_branch_id])
            ->get('/accounting/daily-activity')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('accounting/daily-activity')
                ->has('invoices')->has('purchaseOrders')->has('statements')->has('catalogItems')->has('ledgerAccounts'));
    }

    public function test_customer_invoice_can_be_rendered_as_a_pastel_style_fiscal_pdf(): void
    {
        $invoice = CustomerInvoice::query()->where('invoice_no', 'INV-DEMO-VAT-001')->firstOrFail();

        $response = $this->actingAs($this->admin)
            ->withSession([BranchAccessService::SESSION_KEY => $this->admin->home_branch_id])
            ->get("/accounting/customer-invoices/{$invoice->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertStringContainsString('inline', (string) $response->headers->get('content-disposition'));
        $this->assertStringContainsString($invoice->invoice_no, (string) $response->headers->get('content-disposition'));
    }

    public function test_customer_invoice_posts_receivable_revenue_stock_and_one_source_journal(): void
    {
        $account = ClientAccount::query()->whereHas('clientFile', fn ($query) => $query->where('branch_id', $this->admin->home_branch_id))->firstOrFail();
        $item = CatalogItem::query()->where('track_inventory', true)->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/customer-invoices', [
            'branch_id' => $this->admin->home_branch_id,
            'client_account_id' => $account->id,
            'invoice_date' => today()->toDateString(),
            'due_date' => today()->addDays(30)->toDateString(),
            'currency_code' => 'USD',
            'description' => 'Counter sale of archive boxes',
            'lines' => [['catalog_item_id' => $item->id, 'quantity' => 2, 'unit_price' => 120]],
        ])->assertRedirect()->assertSessionHas('success');

        $invoice = CustomerInvoice::query()->latest('id')->firstOrFail();
        $stockBefore = (float) InventoryMovement::query()->where('branch_id', $invoice->branch_id)->where('catalog_item_id', $item->id)->sum('quantity');
        $this->actingAs($this->admin)->withSession($session)->post("/accounting/customer-invoices/{$invoice->id}/post")
            ->assertRedirect()->assertSessionHas('success');

        $invoice->refresh();
        $this->assertSame('posted', $invoice->status);
        $this->assertNotNull($invoice->account_charge_id);
        $this->assertNotNull($invoice->journal_entry_id);
        $this->assertSame(1, JournalEntry::query()->where('source_type', CustomerInvoice::class)->where('source_id', $invoice->id)->count());
        $this->assertEqualsWithDelta($stockBefore - 2, (float) InventoryMovement::query()->where('branch_id', $invoice->branch_id)->where('catalog_item_id', $item->id)->sum('quantity'), 0.0001);
        $journal = $invoice->journal()->with('lines.account')->firstOrFail();
        $this->assertTrue($journal->lines->contains(fn ($line) => $line->account?->system_key === 'accounts_receivable' && (float) $line->debit > 0));
        $this->assertTrue($journal->lines->contains(fn ($line) => $line->account?->system_key === 'cost_of_sales' && (float) $line->debit > 0));

        $payment = Payment::query()->create([
            'account_id' => $account->id,
            'branch_id' => $invoice->branch_id,
            'amount' => $invoice->total_amount,
            'currency_code' => $invoice->currency_code,
            'method_id' => PaymentMethod::query()->where('code', 'BANK')->value('id') ?: PaymentMethod::query()->value('id'),
            'external_reference' => 'BANK-INV-SETTLEMENT',
            'received_at' => now(),
            'status' => 'approved',
            'made_by' => $this->admin->id,
            'approved_by' => $this->admin->id,
            'approved_at' => now(),
        ]);
        PaymentAllocation::query()->create([
            'payment_id' => $payment->id,
            'charge_id' => $invoice->account_charge_id,
            'amount' => $invoice->total_amount,
        ]);
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertEqualsWithDelta((float) $invoice->total_amount, (float) $invoice->fresh()->paid_amount, 0.0001);
    }

    public function test_purchase_order_receipt_updates_stock_and_creates_linked_supplier_bill(): void
    {
        $supplier = Supplier::query()->where('status', 'active')->firstOrFail();
        $item = CatalogItem::query()->where('track_inventory', true)->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/purchase-orders', [
            'branch_id' => $this->admin->home_branch_id,
            'supplier_id' => $supplier->id,
            'order_date' => today()->toDateString(),
            'expected_date' => today()->addDays(7)->toDateString(),
            'currency_code' => 'USD',
            'lines' => [['catalog_item_id' => $item->id, 'ordered_quantity' => 25, 'unit_price' => 20]],
        ])->assertRedirect()->assertSessionHas('success');

        $order = PurchaseOrder::query()->latest('id')->firstOrFail();
        $this->actingAs($this->admin)->withSession($session)->post("/accounting/purchase-orders/{$order->id}/approve")->assertRedirect();
        $this->actingAs($this->admin)->withSession($session)->post("/accounting/purchase-orders/{$order->id}/receive", ['supplier_reference' => 'DN-1001'])->assertRedirect();
        $this->actingAs($this->admin)->withSession($session)->post("/accounting/purchase-orders/{$order->id}/supplier-bill")->assertRedirect();

        $this->assertSame('received', $order->fresh()->status);
        $this->assertDatabaseHas('inventory_movements', ['source_type' => 'App\\Models\\GoodsReceipt', 'catalog_item_id' => $item->id, 'quantity' => 25]);
        $bill = SupplierBill::query()->where('purchase_order_id', $order->id)->firstOrFail();
        $this->assertSame('draft', $bill->status);
        $this->assertNotNull($bill->goods_receipt_id);
        $this->assertEqualsWithDelta((float) $order->total_amount, (float) $bill->total_amount, 0.0001);
    }

    public function test_csv_bank_statement_can_be_imported_and_an_unmatched_line_posted(): void
    {
        $bank = BankAccount::query()->where('branch_id', $this->admin->home_branch_id)->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];
        $file = UploadedFile::fake()->createWithContent('statement.csv', "date,reference,description,amount,balance\n".today()->toDateString().",FEE-001,Bank service fee,-25.00,9975.00\n");

        $this->actingAs($this->admin)->withSession($session)->post('/accounting/bank-statements', [
            'bank_account_id' => $bank->id, 'statement_no' => 'STM-TEST-001', 'from_date' => today()->toDateString(),
            'to_date' => today()->toDateString(), 'currency_code' => 'USD', 'statement' => $file,
        ])->assertRedirect()->assertSessionHas('success');

        $line = BankStatementLine::query()->firstOrFail();
        $counter = GlAccount::query()->where('organization_id', $this->admin->organization_id)->where('system_key', 'bank_charges')->firstOrFail();
        $this->actingAs($this->admin)->withSession($session)->post("/accounting/bank-statement-lines/{$line->id}/post", ['counter_account_id' => $counter->id])
            ->assertRedirect()->assertSessionHas('success');

        $line->refresh();
        $this->assertSame(JournalEntry::class, $line->match_type);
        $journal = JournalEntry::query()->findOrFail($line->match_id);
        $this->assertEqualsWithDelta(25, (float) $journal->lines()->sum('debit'), 0.0001);
        $this->assertEqualsWithDelta(25, (float) $journal->lines()->sum('credit'), 0.0001);

        $deposit = BankDeposit::query()->create([
            'branch_id' => $bank->branch_id,
            'bank_account_id' => $bank->id,
            'deposit_date' => today(),
            'amount' => 500,
            'currency_code' => 'USD',
            'reference' => 'DEP-TEST-001',
            'status' => 'approved',
            'deposited_by' => $this->admin->id,
            'approved_by' => $this->admin->id,
        ]);
        $this->assertNotNull($deposit->fresh()->journal_entry_id);
        $this->assertDatabaseHas('journal_entries', ['source_type' => BankDeposit::class, 'source_id' => $deposit->id, 'status' => 'posted']);
    }
}
