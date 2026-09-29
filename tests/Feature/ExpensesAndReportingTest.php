<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\Branch;
use App\Models\ExchangeRate;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;
use ZipArchive;

class ExpensesAndReportingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_dashboard_and_reports_are_backed_by_seeded_operational_data(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        Cache::forget('zimrate.latest.usd-zwg-zar');
        Http::fake([
            '*/api/rates/latest' => Http::response([
                [
                    'source' => ['name' => 'Exchange Rate API', 'type' => 'official_api', 'active' => true],
                    'currencyPair' => 'USD/ZAR',
                    'buyRate' => 16.32,
                    'sellRate' => 16.32,
                    'scrapedAt' => '2026-09-28T15:44:17.063486',
                ],
                [
                    'source' => ['name' => 'Exchange Rate API', 'type' => 'official_api', 'active' => true],
                    'currencyPair' => 'USD/ZWG',
                    'buyRate' => 26.63,
                    'sellRate' => 26.63,
                    'scrapedAt' => '2026-09-28T15:44:17.063472',
                ],
                [
                    'source' => ['name' => 'ZimPriceCheck', 'type' => 'parallel_market', 'active' => true],
                    'currencyPair' => 'USD/ZiG',
                    'buyRate' => 40.00,
                    'sellRate' => 41.00,
                    'scrapedAt' => '2026-09-28T16:00:00',
                ],
                [
                    'source' => ['name' => 'Ignored source', 'type' => 'official_api', 'active' => true],
                    'currencyPair' => 'EUR/USD',
                    'buyRate' => 1.10,
                    'sellRate' => 1.11,
                    'scrapedAt' => '2026-09-28T16:00:00',
                ],
            ], 200),
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('metrics.activeClients', 8)
                ->where('metrics.pendingApprovals', 2)
                ->where('metrics.availableStands', 4)
                ->has('financialTrend', 6)
                ->has('recentPayments', 6)
                ->has('exchangeRates', 2)
                ->where('exchangeRates.0.base', 'USD')
                ->where('exchangeRates.0.quote', 'ZWG')
                ->where('exchangeRates.0.quote_label', 'ZiG')
                ->where('exchangeRates.0.buy_rate', 26.63)
                ->where('exchangeRates.0.is_fallback', false)
                ->where('exchangeRates.1.quote', 'ZAR')
                ->where('exchangeRates.1.buy_rate', 16.32));

        $this->actingAs($admin)
            ->get('/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/index')
                ->has('monthly', 12)
                ->has('receivablesAging', 5)
                ->has('developmentPerformance', 2)
                ->has('branchPerformance', 3));
    }

    public function test_dashboard_uses_approved_local_exchange_rates_when_zimrate_is_unavailable(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        ExchangeRate::create([
            'rate_date' => now()->toDateString(),
            'base_currency' => 'USD',
            'quote_currency' => 'ZWG',
            'rate' => 30.71,
            'source' => 'Approved treasury rate',
            'approved_by' => $admin->id,
            'approved_at' => now(),
        ]);
        Cache::forget('zimrate.latest.usd-zwg-zar');
        Http::fake([
            '*/api/rates/latest' => Http::response([], 503),
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('exchangeRates', 1)
                ->where('exchangeRates.0.quote', 'ZWG')
                ->where('exchangeRates.0.buy_rate', 30.71)
                ->where('exchangeRates.0.source_type', 'approved_local')
                ->where('exchangeRates.0.is_fallback', true));
    }

    public function test_dashboard_respects_branch_access_and_administrator_branch_filters(): void
    {
        Http::fake([
            '*/api/rates/latest' => Http::response([], 200),
        ]);

        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $north = Branch::where('organization_id', $admin->organization_id)->where('code', 'NORTH')->firstOrFail();

        $this->actingAs($admin)
            ->get("/dashboard?branch={$north->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('branchFilter.selected', (string) $north->id)
                ->where('branchFilter.label', 'Northern Sales Office')
                ->where('branchFilter.canViewAll', true)
                ->where('metrics.activeClients', 3)
                ->where('recentPayments', fn ($payments): bool => collect($payments)
                    ->isNotEmpty() && collect($payments)->every(fn (array $payment): bool => $payment['branch'] === 'Northern Sales Office')));

        $manager = User::where('email', 'rudo.moyo@alphaland.test')->firstOrFail();
        $bulawayo = Branch::where('organization_id', $admin->organization_id)->where('code', 'BYO')->firstOrFail();

        $this->actingAs($manager)
            ->get("/dashboard?branch={$bulawayo->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('branchFilter.selected', 'all')
                ->where('branchFilter.label', 'Northern Sales Office')
                ->where('branchFilter.canViewAll', false)
                ->has('branchFilter.options', 1)
                ->where('metrics.activeClients', 3)
                ->where('recentPayments', fn ($payments): bool => collect($payments)
                    ->isNotEmpty() && collect($payments)->every(fn (array $payment): bool => $payment['branch'] === 'Northern Sales Office')));
    }

    public function test_submitted_expense_creates_a_line_and_approval_request(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::where('organization_id', $admin->organization_id)->firstOrFail();
        $category = ExpenseCategory::where('organization_id', $admin->organization_id)->firstOrFail();

        $this->actingAs($admin)->post('/administration/expenses', [
            'branch_id' => $branch->id,
            'category_id' => $category->id,
            'expense_no' => '',
            'payee' => 'Test Supplier',
            'currency_code' => 'USD',
            'total_amount' => '325.50',
            'purpose' => 'Approval workflow verification',
            'incurred_at' => now()->toDateTimeString(),
            'status' => 'submitted',
        ])->assertRedirect()->assertSessionHas('success');

        $expense = Expense::where('payee', 'Test Supplier')->firstOrFail();
        $this->assertStringStartsWith('EXP-', $expense->expense_no);
        $this->assertDatabaseHas('expense_lines', ['expense_id' => $expense->id, 'category_id' => $category->id]);
        $this->assertDatabaseHas('approval_requests', ['subject_type' => Expense::class, 'subject_id' => $expense->id, 'status' => 'pending']);
        $this->assertNotNull($expense->approval_request_id);
    }

    public function test_administrator_can_approve_an_expense_request(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $approval = ApprovalRequest::where('status', 'pending')->firstOrFail();

        $this->actingAs($admin)
            ->post("/approvals/{$approval->id}/decision", ['action' => 'approve', 'note' => 'Budget confirmed.'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('approval_requests', ['id' => $approval->id, 'status' => 'approved']);
        $this->assertDatabaseHas('expenses', ['id' => $approval->subject_id, 'status' => 'approved', 'approved_by' => $admin->id]);
        $this->assertDatabaseHas('workflow_actions', ['approval_request_id' => $approval->id, 'action' => 'approved', 'actor_id' => $admin->id]);
    }

    public function test_expense_and_petty_cash_workspaces_are_available(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        foreach (['expenses', 'petty-cash-entries'] as $resource) {
            $this->actingAs($admin)
                ->get("/administration/{$resource}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('administration/resource')
                    ->where('resource.key', $resource));
        }

        $this->actingAs($admin)
            ->get('/approvals')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('approvals/index')->where('summary.pending', 2));
    }

    public function test_branch_manager_can_review_expenses_and_reports_but_not_manage_configuration(): void
    {
        $manager = User::where('email', 'rudo.moyo@alphaland.test')->firstOrFail();

        $this->actingAs($manager)->get('/approvals')->assertOk();
        $this->actingAs($manager)->get('/reports')->assertOk();
        $this->actingAs($manager)->post('/administration/branches', [])->assertForbidden();
    }

    public function test_management_report_can_be_downloaded_as_pdf(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $response = $this->actingAs($admin)->get('/reports/export/pdf');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertDownload();

        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_management_report_can_be_downloaded_as_a_multi_sheet_excel_workbook(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $response = $this->actingAs($admin)->get('/reports/export/excel');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->assertDownload();

        $this->assertInstanceOf(BinaryFileResponse::class, $response->baseResponse);
        $workbookPath = $response->baseResponse->getFile()->getPathname();
        $archive = new ZipArchive;
        $this->assertTrue($archive->open($workbookPath) === true);
        $workbookXml = $archive->getFromName('xl/workbook.xml');
        $archive->close();

        $this->assertIsString($workbookXml);
        $this->assertStringContainsString('Executive Summary', $workbookXml);
        $this->assertStringContainsString('Monthly Performance', $workbookXml);
        $this->assertStringContainsString('Branch Cash Control', $workbookXml);
    }
}
