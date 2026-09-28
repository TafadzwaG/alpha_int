<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

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

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('metrics.activeClients', 8)
                ->where('metrics.pendingApprovals', 2)
                ->where('metrics.availableStands', 4)
                ->has('financialTrend', 6)
                ->has('recentPayments', 6));

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
}
