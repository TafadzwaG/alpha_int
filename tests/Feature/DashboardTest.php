<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\BranchAccessService;
use App\Services\SidebarNavigation;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleTestUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        Http::fake([
            '*/api/rates/latest' => Http::response([], 200),
        ]);

        $this->seed(DatabaseSeeder::class);
        $user = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($user)
            ->withSession([BranchAccessService::SESSION_KEY => $user->home_branch_id])
            ->get('/dashboard')
            ->assertOk();
    }

    public function test_roles_receive_their_own_dashboard_and_scoped_data(): void
    {
        Http::fake(['*/api/rates/latest' => Http::response([], 200)]);
        $this->seed(DatabaseSeeder::class);
        $this->seed(RoleTestUsersSeeder::class);

        foreach ([
            'super-administrator' => ['dashboard', 'Operations dashboard'],
            'system-administrator' => ['dashboard', 'Operations dashboard'],
            'branch-manager' => ['dashboard', 'Branch manager dashboard'],
            'accounts-officer' => ['accounting/index', null],
            'cashier' => ['role-dashboard', 'Cashier dashboard'],
            'sales-officer' => ['role-dashboard', 'Sales dashboard'],
            'auditor' => ['role-dashboard', 'Audit dashboard'],
            'call-centre' => ['call-centre/index', null],
        ] as $email => [$component, $title]) {
            $user = User::where('email', $email.'@roles.alpha.test')->firstOrFail();
            setPermissionsTeamId($user->organization_id);
            $navigation = app(SidebarNavigation::class)->urls($user);
            $this->assertContains('/dashboard', $navigation);
            if (in_array($email, ['super-administrator', 'system-administrator'], true)) {
                $this->assertContains('/administration/users', $navigation);
                $this->assertContains('/administration/developments', $navigation);
                $this->assertContains('/administration/development-phases', $navigation);
                $this->assertContains('/administration/stand-types', $navigation);
            } else {
                $this->assertNotContains('/administration/users', $navigation);
                $this->assertNotContains('/administration/roles', $navigation);
                $this->assertNotContains('/administration/developments', $navigation);
                $this->assertNotContains('/administration/development-phases', $navigation);
                $this->assertNotContains('/administration/stand-types', $navigation);
            }
            if (in_array($email, ['call-centre', 'sales-officer'], true)) {
                $this->assertContains('/call-centre/queue', $navigation);
                $this->assertNotContains('/administration/payments', $navigation);
                $this->assertNotContains('/accounting', $navigation);
            }
            if ($email === 'cashier') {
                $this->assertContains('/administration/payments', $navigation);
                $this->assertContains('/administration/cash-sessions', $navigation);
                $this->assertNotContains('/administration/stands', $navigation);
                $this->assertNotContains('/call-centre', $navigation);
            }
            if ($email === 'auditor') {
                $this->assertContains('/administration/audit-events', $navigation);
                $this->assertNotContains('/call-centre/queue', $navigation);
            }

            $this->actingAs($user)
                ->withSession([BranchAccessService::SESSION_KEY => $user->home_branch_id])
                ->get('/dashboard')->assertOk()
                ->assertInertia(function (AssertableInertia $page) use ($component, $title) {
                    $page->component($component);
                    if ($component === 'role-dashboard') {
                        $page->where('title', $title)->where('branch', 'Head Office')->missing('metrics')->missing('financialTrend');
                    } elseif ($component === 'dashboard') {
                        $page->where('dashboardTitle', $title);
                    } elseif ($component === 'call-centre/index') {
                        $page->has('stats.openTasks')->missing('financialTrend');
                    }
                });
        }
    }

    public function test_property_master_data_is_restricted_to_administrators(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(RoleTestUsersSeeder::class);
        $manager = User::where('email', 'branch-manager@roles.alpha.test')->firstOrFail();
        $administrator = User::where('email', 'system-administrator@roles.alpha.test')->firstOrFail();

        foreach (['developments', 'development-phases', 'stand-types'] as $resource) {
            $this->actingAs($manager)
                ->withSession([BranchAccessService::SESSION_KEY => $manager->home_branch_id])
                ->get("/administration/{$resource}")
                ->assertForbidden();

            $this->actingAs($administrator)
                ->withSession([BranchAccessService::SESSION_KEY => $administrator->home_branch_id])
                ->get("/administration/{$resource}")
                ->assertOk();
        }
    }
}
