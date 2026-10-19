<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use App\Models\UserBranchAccess;
use App\Services\BranchAccessService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BranchSelectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_branch_manager_only_sees_branches_they_can_access(): void
    {
        $manager = User::where('email', 'rudo.moyo@alphaland.test')->firstOrFail();

        $this->actingAs($manager)
            ->get('/select-branch')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/select-branch')
                ->has('branches', 1)
                ->where('branches.0.code', 'NORTH')
                ->where('branches.0.isHome', true));
    }

    public function test_administrator_can_select_any_active_organization_branch(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $bulawayo = Branch::where('organization_id', $admin->organization_id)->where('code', 'BYO')->firstOrFail();

        $this->actingAs($admin)
            ->post('/select-branch', ['branch_id' => $bulawayo->id])
            ->assertRedirect(route('dashboard', absolute: false))
            ->assertSessionHas(BranchAccessService::SESSION_KEY, $bulawayo->id);
    }

    public function test_user_cannot_select_a_branch_outside_their_access(): void
    {
        $manager = User::where('email', 'rudo.moyo@alphaland.test')->firstOrFail();
        $bulawayo = Branch::where('organization_id', $manager->organization_id)->where('code', 'BYO')->firstOrFail();

        $this->actingAs($manager)
            ->from('/select-branch')
            ->post('/select-branch', ['branch_id' => $bulawayo->id])
            ->assertRedirect('/select-branch')
            ->assertSessionHasErrors('branch_id')
            ->assertSessionMissing(BranchAccessService::SESSION_KEY);
    }

    public function test_dashboard_requires_a_current_accessible_branch(): void
    {
        $manager = User::where('email', 'rudo.moyo@alphaland.test')->firstOrFail();
        $branchAccess = UserBranchAccess::where('user_id', $manager->id)->firstOrFail();

        $this->actingAs($manager)
            ->get('/dashboard')
            ->assertRedirect(route('branch-selection.index', absolute: false));

        $branchAccess->update(['active' => false]);

        $this->actingAs($manager)
            ->withSession([BranchAccessService::SESSION_KEY => $branchAccess->branch_id])
            ->get('/dashboard')
            ->assertRedirect(route('branch-selection.index', absolute: false))
            ->assertSessionMissing(BranchAccessService::SESSION_KEY);
    }
}
