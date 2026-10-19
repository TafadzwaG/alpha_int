<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Models\UserBranchAccess;
use Database\Seeders\PhaseOneSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserAdministrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PhaseOneSeeder::class);
        $this->admin = User::where('email', 'test@example.com')->firstOrFail();
        $this->branch = Branch::where('organization_id', $this->admin->organization_id)->firstOrFail();
        setPermissionsTeamId($this->admin->organization_id);
    }

    public function test_global_search_prioritizes_clients_and_requires_permission(): void
    {
        $this->actingAs($this->admin)->post('/administration/clients', ['owning_branch_id' => $this->branch->id, 'first_name' => 'Searchable', 'last_name' => 'Person', 'phone_normalized' => '+263771234567', 'status' => 'active'])->assertSessionHasNoErrors();
        $this->actingAs($this->admin)->getJson('/global-search?q=Searchable%20Person')->assertOk()
            ->assertJsonPath('groups.0.label', 'Clients')
            ->assertJsonPath('groups.0.items.0.title', 'Searchable Person')
            ->assertJsonPath('groups.0.items.0.documents.0.kind', 'print_receipts')
            ->assertJsonPath('groups.0.items.0.documents.3.kind', 'download_statement')
            ->assertJsonMissingPath('groups.0.items.0.national_id');
        $this->actingAs($this->admin)->getJson('/global-search?q=771234567')->assertOk()->assertJsonCount(1, 'groups.0.items');
        $this->actingAs($this->admin)->getJson('/global-search?q=a')->assertUnprocessable();
        $viewer = User::factory()->create(['organization_id' => $this->admin->organization_id, 'home_branch_id' => $this->branch->id]);
        $this->actingAs($viewer)->getJson('/global-search?q=Searchable')->assertOk()->assertExactJson(['groups' => []]);
    }

    public function test_administrator_sees_an_organization_scoped_user_directory_with_stats(): void
    {
        $managedUser = $this->createManagedUser(['status' => 'suspended']);
        $otherOrganization = Organization::create([
            'code' => 'OTHER',
            'legal_name' => 'Other Organization',
            'base_currency_code' => 'USD',
            'timezone' => 'Africa/Harare',
            'status' => 'active',
        ]);
        User::factory()->create([
            'organization_id' => $otherOrganization->id,
            'name' => 'Outside User',
            'status' => 'active',
        ]);

        $this->actingAs($this->admin)
            ->get('/administration/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/users/index')
                ->where('stats.total', 2)
                ->where('stats.active', 1)
                ->where('stats.restricted', 1)
                ->has('users.data', 2)
                ->where('users.data', fn ($users) => collect($users)->contains('id', $managedUser->id)
                    && collect($users)->doesntContain('name', 'Outside User')));
    }

    public function test_administrator_can_invite_a_user_with_roles_and_branch_access(): void
    {
        Notification::fake();
        $role = Role::where('organization_id', $this->admin->organization_id)->where('code', 'BRANCH_MANAGER')->firstOrFail();

        $response = $this->actingAs($this->admin)->post('/administration/users/invite', [
            'name' => 'New Branch User',
            'email' => 'new.user@alphaland.test',
            'home_branch_id' => (string) $this->branch->id,
            'role_ids' => [(string) $role->id],
            'branch_ids' => [(string) $this->branch->id],
            'mfa_state' => 'required',
        ]);

        $user = User::where('email', 'new.user@alphaland.test')->firstOrFail();
        $response->assertRedirect(route('administration.users.show', $user));
        $this->assertSame($this->admin->organization_id, $user->organization_id);
        $this->assertTrue($user->hasRole($role));
        $this->assertDatabaseHas('user_branch_access', [
            'user_id' => $user->id,
            'branch_id' => $this->branch->id,
            'active' => true,
        ]);
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'users.invited',
            'subject_type' => 'User',
            'subject_id' => $user->id,
        ]);
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_administrator_can_view_and_update_a_detailed_user_profile(): void
    {
        $user = $this->createManagedUser();
        $role = Role::where('organization_id', $this->admin->organization_id)->where('code', 'ACCOUNTS_OFFICER')->firstOrFail();

        $this->actingAs($this->admin)
            ->get(route('administration.users.show', $user))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/users/show')
                ->where('managedUser.id', $user->id)
                ->where('managedUser.email', $user->email)
                ->where('canManage', true)
                ->where('canImpersonate', true));

        $this->actingAs($this->admin)
            ->put(route('administration.users.update', $user), [
                'name' => 'Updated User',
                'email' => 'updated.user@alphaland.test',
                'home_branch_id' => (string) $this->branch->id,
                'role_ids' => [(string) $role->id],
                'branch_ids' => [(string) $this->branch->id],
                'mfa_state' => 'enabled',
                'status' => 'active',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $user->refresh();
        $this->assertSame('Updated User', $user->name);
        $this->assertSame('enabled', $user->mfa_state);
        $this->assertTrue($user->hasRole($role));
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'users.updated',
            'subject_id' => $user->id,
        ]);
    }

    public function test_administrator_can_send_a_password_reset_link(): void
    {
        Notification::fake();
        $user = $this->createManagedUser();

        $this->actingAs($this->admin)
            ->post(route('administration.users.password-reset', $user))
            ->assertRedirect()
            ->assertSessionHas('success');

        Notification::assertSentTo($user, ResetPassword::class);
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'users.password_reset_requested',
            'subject_id' => $user->id,
        ]);
    }

    public function test_administrator_can_impersonate_a_user_and_return_to_their_account(): void
    {
        $user = $this->createManagedUser();

        $this->actingAs($this->admin)
            ->post(route('administration.users.impersonate', $user))
            ->assertRedirect(route('branch-selection.index'));

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'users.impersonation_started',
            'subject_id' => $user->id,
            'actor_id' => $this->admin->id,
        ]);

        $this->post(route('impersonation.leave'))
            ->assertRedirect(route('administration.users.index'));

        $this->assertAuthenticatedAs($this->admin);
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'users.impersonation_ended',
            'subject_id' => $user->id,
            'actor_id' => $this->admin->id,
        ]);
    }

    public function test_administrator_can_export_the_filtered_user_directory_to_excel(): void
    {
        $this->createManagedUser(['name' => 'Export User']);

        $this->actingAs($this->admin)
            ->get('/administration/users/export?search=Export')
            ->assertOk()
            ->assertDownload('alpha-land-users-'.now()->format('Y-m-d').'.xlsx')
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_users_from_another_organization_cannot_be_managed(): void
    {
        $otherOrganization = Organization::create([
            'code' => 'OTHER',
            'legal_name' => 'Other Organization',
            'base_currency_code' => 'USD',
            'timezone' => 'Africa/Harare',
            'status' => 'active',
        ]);
        $outsideUser = User::factory()->create([
            'organization_id' => $otherOrganization->id,
            'status' => 'active',
        ]);

        $this->actingAs($this->admin)
            ->get(route('administration.users.show', $outsideUser))
            ->assertNotFound();
    }

    private function createManagedUser(array $attributes = []): User
    {
        $user = User::factory()->create([
            'organization_id' => $this->admin->organization_id,
            'home_branch_id' => $this->branch->id,
            'status' => 'active',
            'mfa_state' => 'disabled',
            ...$attributes,
        ]);
        $role = Role::where('organization_id', $this->admin->organization_id)->where('code', 'BRANCH_MANAGER')->firstOrFail();
        $user->syncRoles([$role]);
        UserBranchAccess::create([
            'user_id' => $user->id,
            'branch_id' => $this->branch->id,
            'access_level' => 'operational',
            'active' => true,
        ]);

        return $user;
    }
}
