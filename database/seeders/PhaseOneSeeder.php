<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Currency;
use App\Models\DocumentSequence;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\PaymentMethod;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StandType;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserBranchAccess;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class PhaseOneSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ([
            ['code' => 'USD', 'name' => 'United States Dollar', 'symbol' => '$', 'decimal_places' => 2],
            ['code' => 'ZWG', 'name' => 'Zimbabwe Gold', 'symbol' => 'ZiG', 'decimal_places' => 2],
            ['code' => 'ZAR', 'name' => 'South African Rand', 'symbol' => 'R', 'decimal_places' => 2],
        ] as $currency) {
            Currency::updateOrCreate(['code' => $currency['code']], [...$currency, 'active' => true]);
        }

        $organization = Organization::updateOrCreate(
            ['code' => 'ALPHA'],
            [
                'legal_name' => 'Alpha International Land Developers Private Limited',
                'trading_name' => 'Alpha Land',
                'base_currency_code' => 'USD',
                'timezone' => 'Africa/Harare',
                'status' => 'active',
            ],
        );

        $branch = Branch::updateOrCreate(
            ['organization_id' => $organization->id, 'code' => 'HQ'],
            ['name' => 'Head Office', 'timezone' => 'Africa/Harare', 'status' => 'active'],
        );

        foreach ([
            ['name' => 'phase-one.view', 'code' => 'PHASE_ONE_VIEW', 'description' => 'View organization setup, access control and master data.', 'risk_level' => 'standard'],
            ['name' => 'phase-one.manage', 'code' => 'PHASE_ONE_MANAGE', 'description' => 'Create and change Phase 1 configuration records.', 'risk_level' => 'critical'],
            ['name' => 'payments.capture', 'code' => 'PAYMENTS_CAPTURE', 'description' => 'Record client payments and propose how they should be applied.', 'risk_level' => 'sensitive'],
            ['name' => 'payments.approve', 'code' => 'PAYMENTS_APPROVE', 'description' => 'Independently approve or reject recorded client payments.', 'risk_level' => 'critical'],
            ['name' => 'audit.view', 'code' => 'AUDIT_VIEW', 'description' => 'View immutable audit events and integrity hashes.', 'risk_level' => 'sensitive'],
            ['name' => 'expenses.view', 'code' => 'EXPENSES_VIEW', 'description' => 'View expenses, approvals and petty cash.', 'risk_level' => 'standard'],
            ['name' => 'expenses.manage', 'code' => 'EXPENSES_MANAGE', 'description' => 'Capture expenses and petty cash entries.', 'risk_level' => 'sensitive'],
            ['name' => 'expenses.approve', 'code' => 'EXPENSES_APPROVE', 'description' => 'Approve or reject submitted expenses.', 'risk_level' => 'critical'],
            ['name' => 'reports.view', 'code' => 'REPORTS_VIEW', 'description' => 'View operational and management reports.', 'risk_level' => 'standard'],
            ['name' => 'accounting.view', 'code' => 'ACCOUNTING_VIEW', 'description' => 'View accounting dashboards, debtors and receivables ageing.', 'risk_level' => 'sensitive'],
            ['name' => 'accounting.manage', 'code' => 'ACCOUNTING_MANAGE', 'description' => 'Manage suppliers, bills, journals and accounting configuration.', 'risk_level' => 'sensitive'],
            ['name' => 'accounting.post', 'code' => 'ACCOUNTING_POST', 'description' => 'Post and reverse balanced general-ledger journals.', 'risk_level' => 'critical'],
            ['name' => 'accounting.close-period', 'code' => 'ACCOUNTING_CLOSE_PERIOD', 'description' => 'Close and reopen accounting periods.', 'risk_level' => 'critical'],
            ['name' => 'call-centre.view', 'code' => 'CALL_CENTRE_VIEW', 'description' => 'View the branch call centre workspace and client contact history.', 'risk_level' => 'standard'],
            ['name' => 'call-centre.interactions.create', 'code' => 'CALL_CENTRE_INTERACTIONS_CREATE', 'description' => 'Record client calls, outcomes and promises to pay.', 'risk_level' => 'sensitive'],
            ['name' => 'call-centre.tasks.manage', 'code' => 'CALL_CENTRE_TASKS_MANAGE', 'description' => 'Create and complete call centre follow-up tasks.', 'risk_level' => 'sensitive'],
            ['name' => 'call-centre.tasks.assign', 'code' => 'CALL_CENTRE_TASKS_ASSIGN', 'description' => 'Assign and reassign agent work queues.', 'risk_level' => 'sensitive'],
            ['name' => 'call-centre.campaigns.manage', 'code' => 'CALL_CENTRE_CAMPAIGNS_MANAGE', 'description' => 'Create campaigns and generate collection call lists.', 'risk_level' => 'sensitive'],
            ['name' => 'call-centre.reports.view', 'code' => 'CALL_CENTRE_REPORTS_VIEW', 'description' => 'View and export call centre performance reports.', 'risk_level' => 'standard'],
            ['name' => 'call-centre.supervise', 'code' => 'CALL_CENTRE_SUPERVISE', 'description' => 'Review escalations and branch agent performance.', 'risk_level' => 'critical'],
        ] as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission['name'], 'guard_name' => 'web'],
                [...$permission, 'guard_name' => 'web', 'active' => true],
            );
        }

        setPermissionsTeamId($organization->id);

        $allPermissions = Permission::query()->get();
        $viewPermission = Permission::findByName('phase-one.view', 'web');
        $paymentCapturePermission = Permission::findByName('payments.capture', 'web');
        $paymentApprovePermission = Permission::findByName('payments.approve', 'web');
        $auditPermission = Permission::findByName('audit.view', 'web');
        $expenseViewPermission = Permission::findByName('expenses.view', 'web');
        $expenseManagePermission = Permission::findByName('expenses.manage', 'web');
        $expenseApprovePermission = Permission::findByName('expenses.approve', 'web');
        $reportsPermission = Permission::findByName('reports.view', 'web');
        $accountingPermission = Permission::findByName('accounting.view', 'web');
        $accountingManagePermission = Permission::findByName('accounting.manage', 'web');
        $accountingPostPermission = Permission::findByName('accounting.post', 'web');
        $accountingClosePeriodPermission = Permission::findByName('accounting.close-period', 'web');
        $callCentreViewPermission = Permission::findByName('call-centre.view', 'web');
        $callCentreInteractionPermission = Permission::findByName('call-centre.interactions.create', 'web');
        $callCentreTaskPermission = Permission::findByName('call-centre.tasks.manage', 'web');
        $callCentreAssignPermission = Permission::findByName('call-centre.tasks.assign', 'web');
        $callCentreCampaignPermission = Permission::findByName('call-centre.campaigns.manage', 'web');
        $callCentreReportPermission = Permission::findByName('call-centre.reports.view', 'web');
        $callCentreSupervisePermission = Permission::findByName('call-centre.supervise', 'web');

        $roleBlueprints = [
            ['name' => 'Super Administrator', 'code' => 'SUPER_ADMIN', 'scope_type' => 'organization', 'permissions' => $allPermissions],
            ['name' => 'System Administrator', 'code' => 'SYSTEM_ADMIN', 'scope_type' => 'organization', 'permissions' => $allPermissions],
            ['name' => 'Branch Manager', 'code' => 'BRANCH_MANAGER', 'scope_type' => 'branch', 'permissions' => collect([$viewPermission, $paymentApprovePermission, $expenseViewPermission, $expenseApprovePermission, $reportsPermission, $callCentreViewPermission, $callCentreInteractionPermission, $callCentreTaskPermission, $callCentreAssignPermission, $callCentreCampaignPermission, $callCentreReportPermission, $callCentreSupervisePermission])],
            ['name' => 'Sales Officer', 'code' => 'SALES_OFFICER', 'scope_type' => 'branch', 'permissions' => collect([$callCentreViewPermission, $callCentreInteractionPermission, $callCentreTaskPermission])],
            ['name' => 'Accounts Officer', 'code' => 'ACCOUNTS_OFFICER', 'scope_type' => 'branch', 'permissions' => collect([$viewPermission, $paymentCapturePermission, $expenseViewPermission, $expenseManagePermission, $reportsPermission, $accountingPermission, $accountingManagePermission, $accountingPostPermission, $accountingClosePeriodPermission, $callCentreViewPermission, $callCentreInteractionPermission, $callCentreTaskPermission, $callCentreCampaignPermission, $callCentreReportPermission])],
            ['name' => 'Call Centre', 'code' => 'CALL_CENTRE', 'scope_type' => 'branch', 'permissions' => collect([$callCentreViewPermission, $callCentreInteractionPermission, $callCentreTaskPermission])],
            ['name' => 'Cashier', 'code' => 'CASHIER', 'scope_type' => 'branch', 'permissions' => collect([$viewPermission, $paymentCapturePermission, $expenseViewPermission, $expenseManagePermission])],
            ['name' => 'Auditor', 'code' => 'AUDITOR', 'scope_type' => 'organization', 'permissions' => collect([$viewPermission, $auditPermission, $expenseViewPermission, $reportsPermission, $accountingPermission, $callCentreViewPermission, $callCentreReportPermission])],
        ];

        foreach ($roleBlueprints as $blueprint) {
            $role = Role::updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'name' => $blueprint['name'],
                    'guard_name' => 'web',
                ],
                [
                    'code' => $blueprint['code'],
                    'description' => $blueprint['name'].' access profile.',
                    'scope_type' => $blueprint['scope_type'],
                    'active' => true,
                ],
            );
            $role->syncPermissions($blueprint['permissions']);
        }

        $admin = User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'System Administrator', 'password' => 'password', 'email_verified_at' => now()],
        );
        $admin->forceFill([
            'organization_id' => $organization->id,
            'home_branch_id' => $branch->id,
            'status' => 'active',
        ])->save();
        $admin->syncRoles([Role::findByName('Super Administrator', 'web')]);

        UserBranchAccess::updateOrCreate(
            ['user_id' => $admin->id, 'branch_id' => $branch->id],
            ['access_level' => 'administrative', 'active' => true],
        );

        foreach ([
            ['code' => 'CASH', 'name' => 'Cash', 'requires_reference' => false, 'cash_equivalent' => true],
            ['code' => 'BANK', 'name' => 'Bank Transfer', 'requires_reference' => true, 'cash_equivalent' => false],
            ['code' => 'CARD', 'name' => 'Card', 'requires_reference' => true, 'cash_equivalent' => false],
            ['code' => 'MOBILE', 'name' => 'Mobile Money', 'requires_reference' => true, 'cash_equivalent' => false],
        ] as $method) {
            PaymentMethod::updateOrCreate(['code' => $method['code']], [...$method, 'active' => true]);
        }

        foreach ([
            ['code' => 'RESIDENTIAL', 'name' => 'Residential'],
            ['code' => 'COMMERCIAL', 'name' => 'Commercial'],
            ['code' => 'INDUSTRIAL', 'name' => 'Industrial'],
        ] as $standType) {
            StandType::updateOrCreate(
                ['organization_id' => $organization->id, 'code' => $standType['code']],
                [...$standType, 'active' => true],
            );
        }

        foreach ([
            ['code' => 'ADMIN', 'name' => 'Administration'],
            ['code' => 'SALES', 'name' => 'Sales and marketing'],
            ['code' => 'OPERATIONS', 'name' => 'Property operations'],
        ] as $category) {
            ExpenseCategory::updateOrCreate(
                ['organization_id' => $organization->id, 'code' => $category['code']],
                [...$category, 'policy_currency' => 'USD', 'active' => true],
            );
        }

        foreach (['RECEIPT' => 'RCT', 'PAYMENT' => 'PAY', 'CLIENT' => 'CLI', 'ALLOCATION' => 'ALL'] as $documentType => $prefix) {
            DocumentSequence::updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'branch_id' => $branch->id,
                    'document_type' => $documentType,
                    'period_key' => (string) now()->year,
                ],
                ['prefix' => $prefix, 'next_value' => 1, 'padding' => 6],
            );
        }

        SystemSetting::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'branch_id' => null,
                'setting_key' => 'finance.base_currency',
                'effective_from' => now()->startOfYear(),
            ],
            ['value_json' => ['code' => 'USD'], 'data_type' => 'json', 'created_by' => $admin->id],
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
