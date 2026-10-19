<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\UserBranchAccess;
use App\Services\BranchAccessService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountingDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_administrator_can_view_the_accounting_dashboard_and_ageing_summary(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->get('/accounting')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('accounting/index')
                ->where('currency', 'USD')
                ->where('summary.debtorCount', 3)
                ->where('summary.overdueDebtorCount', 2)
                ->where('summary.totalReceivables', fn (float $total): bool => $total > 0)
                ->where('summary.over90', fn (float $total): bool => $total > 0)
                ->has('aging', 7)
                ->where('aging.0.key', 'current')
                ->where('aging.6.key', '180')
                ->where('aging.5.key', '150')
                ->where('aging.5.accounts', 1)
                ->has('monthly', 6)
                ->has('topDebtors', 3)
                ->has('recentPayments', 3));
    }

    public function test_debtors_can_be_filtered_by_ageing_bucket_and_search_term(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->get('/accounting/debtors?bucket=150')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('accounting/debtors')
                ->where('filters.bucket', '150')
                ->has('debtors.data', 1)
                ->where('debtors.data.0.aging.150', fn (float $total): bool => $total > 0)
                ->where('statement.customer.account_no', 'ACC-CLI-1001')
                ->has('statement.transactions', 3)
                ->has('statement.aging', 7));

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->get('/accounting/debtors?search=ACC-CLI-1001')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.search', 'ACC-CLI-1001')
                ->has('debtors.data', 1)
                ->where('debtors.data.0.account_no', 'ACC-CLI-1001'));
    }

    public function test_accounts_officer_only_sees_debtors_from_assigned_branches(): void
    {
        $organizationId = User::where('email', 'test@example.com')->value('organization_id');
        $branch = Branch::where('organization_id', $organizationId)->where('code', 'NORTH')->firstOrFail();
        $officer = User::factory()->create([
            'organization_id' => $organizationId,
            'home_branch_id' => $branch->id,
            'email' => 'accounts.north@alphaland.test',
        ]);
        setPermissionsTeamId($organizationId);
        $officer->assignRole(Role::where('organization_id', $organizationId)->where('code', 'ACCOUNTS_OFFICER')->firstOrFail());
        UserBranchAccess::create([
            'user_id' => $officer->id,
            'branch_id' => $branch->id,
            'access_level' => 'accounts',
            'active' => true,
        ]);

        $this->actingAs($officer)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->get('/accounting')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.debtorCount', 3)
                ->has('topDebtors', 3)
                ->where('topDebtors.0.branch', 'Northern Sales Office')
                ->where('topDebtors.1.branch', 'Northern Sales Office')
                ->where('topDebtors.2.branch', 'Northern Sales Office'));
    }

    public function test_user_without_accounting_permission_is_denied(): void
    {
        $manager = User::where('email', 'rudo.moyo@alphaland.test')->firstOrFail();

        $this->actingAs($manager)
            ->withSession([BranchAccessService::SESSION_KEY => $manager->home_branch_id])
            ->get('/accounting')
            ->assertForbidden();
        $this->actingAs($manager)
            ->withSession([BranchAccessService::SESSION_KEY => $manager->home_branch_id])
            ->get('/accounting/debtors')
            ->assertForbidden();
    }
}
