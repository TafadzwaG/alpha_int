<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Models\UserBranchAccess;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

class RoleTestUsersSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Role test accounts may only be seeded locally or in tests.');
        }

        $organization = Organization::where('code', 'ALPHA')->firstOrFail();
        $branches = Branch::where('organization_id', $organization->id)->where('status', 'active')->get();
        $home = $branches->firstWhere('code', 'HQ') ?? $branches->first();
        if (! $home) {
            throw new \RuntimeException('An active branch is required.');
        }

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId($organization->id);
        try {
            DB::transaction(function () use ($organization, $branches, $home) {
                $callCentre = Role::firstOrCreate(
                    ['organization_id' => $organization->id, 'name' => 'Call Centre', 'guard_name' => 'web'],
                    ['code' => 'CALL_CENTRE', 'scope_type' => 'branch', 'description' => 'Client calls and assigned follow-up work.', 'active' => true],
                );
                if ($callCentre->wasRecentlyCreated) {
                    $callCentre->syncPermissions(['call-centre.view', 'call-centre.interactions.create', 'call-centre.tasks.manage']);
                }

                foreach (Role::where('organization_id', $organization->id)->where('guard_name', 'web')->where('active', true)->get() as $role) {
                    $email = Str::slug($role->name).'@roles.alpha.test';
                    $user = User::firstOrNew(['email' => $email]);
                    if ($user->exists && $user->organization_id !== $organization->id) {
                        throw new \RuntimeException('Test email already belongs to another organization.');
                    }
                    $user->forceFill([
                        'name' => 'Test '.$role->name,
                        'organization_id' => $organization->id,
                        'home_branch_id' => $home->id,
                        'password' => 'AlphaTest!2026',
                        'email_verified_at' => now(),
                        'status' => 'active',
                        'mfa_state' => 'disabled',
                    ])->save();
                    $user->syncRoles([$role]);
                    $allowed = $role->scope_type === 'organization' ? $branches : collect([$home]);
                    UserBranchAccess::where('user_id', $user->id)->whereNotIn('branch_id', $allowed->pluck('id'))->delete();
                    foreach ($allowed as $branch) {
                        UserBranchAccess::updateOrCreate(
                            ['user_id' => $user->id, 'branch_id' => $branch->id],
                            ['access_level' => $role->scope_type === 'organization' ? 'administrative' : 'operational', 'active' => true, 'valid_from' => null, 'valid_to' => null],
                        );
                    }
                    $this->command?->info($role->name.' | '.$email.' | '.$allowed->count().' branch(es)');
                }
            });
        } finally {
            setPermissionsTeamId($previousTeam);
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }
}
