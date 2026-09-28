<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ErpSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_every_operational_and_permission_table(): void
    {
        $tables = [
            'organizations', 'branches', 'users', 'roles', 'permissions',
            'model_has_roles', 'model_has_permissions', 'role_has_permissions',
            'user_branch_access', 'system_settings', 'document_sequences', 'currencies',
            'exchange_rates', 'payment_methods', 'expense_categories', 'bank_accounts',
            'clients', 'client_contacts', 'client_files', 'developments', 'development_phases',
            'stand_types', 'stands', 'stand_allocations', 'allocation_status_history',
            'allocation_disputes', 'client_accounts', 'account_charges', 'ledger_entries',
            'payments', 'payment_allocations', 'receipts', 'payment_reversals', 'cash_sessions',
            'cash_session_counts', 'bank_deposits', 'bank_deposit_items', 'reconciliation_runs',
            'reconciliation_items', 'expenses', 'expense_lines', 'petty_cash_entries', 'documents',
            'client_interactions', 'follow_up_tasks', 'approval_requests', 'approval_steps',
            'workflow_actions', 'audit_events', 'outbox_events', 'report_refresh_log',
        ];

        foreach ($tables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table: {$table}");
        }

        $this->assertTrue(Schema::hasColumns('payments', [
            'public_id', 'account_id', 'branch_id', 'cash_session_id', 'amount',
            'currency_code', 'method_id', 'external_reference', 'status', 'made_by',
        ]));

        $this->assertTrue(Schema::hasColumns('audit_events', [
            'organization_id', 'actor_id', 'event_type', 'subject_type', 'subject_id',
            'before_json', 'after_json', 'previous_hash', 'event_hash',
        ]));
    }

    public function test_it_uses_organization_scoped_spatie_roles_and_permissions(): void
    {
        $organization = Organization::create([
            'code' => 'ALPHA',
            'legal_name' => 'Alpha International Land Developers',
            'base_currency_code' => 'USD',
        ]);

        $user = User::factory()->create(['organization_id' => $organization->id]);

        setPermissionsTeamId($organization->id);

        $permission = Permission::create([
            'name' => 'payments.approve',
            'code' => 'payments.approve',
            'guard_name' => 'web',
            'description' => 'Approve a submitted client payment.',
            'risk_level' => 'high',
        ]);

        $role = Role::create([
            'organization_id' => $organization->id,
            'name' => 'Branch Manager',
            'code' => 'branch_manager',
            'guard_name' => 'web',
            'scope_type' => 'branch',
        ]);

        $role->givePermissionTo($permission);
        $user->assignRole($role);

        $this->assertTrue($user->fresh()->hasRole('Branch Manager'));
        $this->assertTrue($user->fresh()->can('payments.approve'));
    }
}
