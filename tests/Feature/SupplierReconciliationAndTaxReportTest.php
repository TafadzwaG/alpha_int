<?php

namespace Tests\Feature;

use App\Models\SupplierBill;
use App\Models\SupplierReconciliation;
use App\Models\User;
use App\Services\BranchAccessService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SupplierReconciliationAndTaxReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->admin = User::query()->where('email', 'test@example.com')->firstOrFail();
    }

    public function test_supplier_reconciliation_workspace_exposes_seeded_signed_off_evidence(): void
    {
        $this->actingAs($this->admin)
            ->withSession([BranchAccessService::SESSION_KEY => $this->admin->home_branch_id])
            ->get('/accounting/supplier-reconciliation')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('accounting/supplier-reconciliation')
                ->has('reconciliations', 1)
                ->where('reconciliations.0.status', 'reconciled')
                ->where('reconciliations.0.statement_no', 'COH-STATEMENT-DEMO'));
    }

    public function test_statement_import_auto_match_and_zero_variance_sign_off_work_end_to_end(): void
    {
        $bill = SupplierBill::query()->where('bill_no', 'AP-DEMO-003')->with('payments')->firstOrFail();
        $payment = $bill->payments->firstOrFail();
        $closing = (float) $bill->total_amount - (float) $payment->amount;
        $csv = implode("\n", [
            'date,type,reference,description,amount',
            implode(',', [$bill->bill_date->toDateString(), 'invoice', $bill->supplier_reference, 'Electricity connection invoice', $bill->total_amount]),
            implode(',', [$payment->payment_date->toDateString(), 'payment', $payment->reference, 'EFT payment', -((float) $payment->amount)]),
        ])."\n";
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];

        $response = $this->actingAs($this->admin)->withSession($session)->post('/accounting/supplier-reconciliations', [
            'supplier_id' => $bill->supplier_id,
            'branch_id' => $bill->branch_id,
            'statement_no' => 'ZESA-STATEMENT-TEST',
            'statement_date' => today()->toDateString(),
            'from_date' => $bill->bill_date->toDateString(),
            'to_date' => today()->toDateString(),
            'currency_code' => 'USD',
            'opening_balance' => 0,
            'statement_balance' => $closing,
            'notes' => 'Feature test statement',
            'statement' => UploadedFile::fake()->createWithContent('zesa.csv', $csv),
        ]);

        $record = SupplierReconciliation::query()->where('statement_no', 'ZESA-STATEMENT-TEST')->firstOrFail();
        $response->assertRedirect('/accounting/supplier-reconciliation?reconciliation='.$record->id)->assertSessionHas('success');
        $this->assertEqualsWithDelta(0, (float) $record->variance, 0.01);
        $this->assertSame(2, $record->lines()->where('match_status', 'unmatched')->count());

        $this->actingAs($this->admin)->withSession($session)
            ->post("/accounting/supplier-reconciliations/{$record->id}/auto-match")
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertSame(2, $record->lines()->where('match_status', 'matched')->count());

        $this->actingAs($this->admin)->withSession($session)
            ->post("/accounting/supplier-reconciliations/{$record->id}/approve")
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertSame('reconciled', $record->fresh()->status);
        $this->assertNotNull($record->fresh()->approved_at);
    }

    public function test_supplier_reconciliation_cannot_be_signed_off_with_unmatched_lines_or_a_variance(): void
    {
        $bill = SupplierBill::query()->where('bill_no', 'AP-DEMO-004')->firstOrFail();
        $record = SupplierReconciliation::query()->create([
            'organization_id' => $this->admin->organization_id,
            'branch_id' => $bill->branch_id,
            'supplier_id' => $bill->supplier_id,
            'statement_no' => 'UNBALANCED-TEST',
            'statement_date' => today(),
            'from_date' => $bill->bill_date,
            'to_date' => today(),
            'currency_code' => 'USD',
            'opening_balance' => 0,
            'statement_balance' => 1,
            'ledger_balance' => 0,
            'variance' => 0,
            'status' => 'in_review',
            'original_filename' => 'unbalanced.csv',
            'prepared_by' => $this->admin->id,
        ]);
        $record->lines()->create([
            'transaction_date' => today(),
            'transaction_type' => 'invoice',
            'description' => 'Unmatched supplier charge',
            'amount' => 1,
            'line_hash' => hash('sha256', 'unbalanced-test-line'),
            'match_status' => 'unmatched',
        ]);

        $this->actingAs($this->admin)
            ->withSession([BranchAccessService::SESSION_KEY => $this->admin->home_branch_id])
            ->post("/accounting/supplier-reconciliations/{$record->id}/approve")
            ->assertRedirect()
            ->assertSessionHasErrors('reconciliation');
        $this->assertSame('in_review', $record->fresh()->status);
    }

    public function test_tax_report_uses_posted_source_documents_reconciles_controls_and_exports_excel(): void
    {
        $session = [BranchAccessService::SESSION_KEY => $this->admin->home_branch_id];
        $url = '/accounting/tax-report?from='.today()->startOfYear()->toDateString().'&to='.today()->toDateString();

        $this->actingAs($this->admin)->withSession($session)->get($url)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('accounting/tax-report')
                ->where('report.summary.output_tax', 300)
                ->where('report.summary.control_output', 300)
                ->where('report.summary.output_variance', 0)
                ->where('report.summary.input_variance', 0)
                ->has('report.rows'));

        $this->actingAs($this->admin)->withSession($session)
            ->get('/accounting/tax-report/export?from='.today()->startOfYear()->toDateString().'&to='.today()->toDateString())
            ->assertOk()
            ->assertDownload();
    }

    public function test_tax_code_filter_does_not_claim_a_whole_ledger_control_reconciliation(): void
    {
        $this->actingAs($this->admin)
            ->withSession([BranchAccessService::SESSION_KEY => $this->admin->home_branch_id])
            ->get('/accounting/tax-report?from='.today()->startOfYear()->toDateString().'&to='.today()->toDateString().'&tax_code=VAT15')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('report.summary.control_reconciliation_available', false)
                ->where('report.summary.control_output', null)
                ->where('report.summary.control_input', null));
    }
}
