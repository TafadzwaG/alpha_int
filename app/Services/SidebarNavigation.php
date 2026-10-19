<?php

namespace App\Services;

use App\Models\User;

class SidebarNavigation
{
    public function urls(User $user): array
    {
        $urls = ['/dashboard'];
        $admin = $user->hasAnyRole(['Super Administrator', 'System Administrator']);
        $roles = fn (array $names) => $admin || $user->hasAnyRole($names);
        $add = function (bool $allowed, array $paths) use (&$urls): void {
            if ($allowed) {
                $urls = [...$urls, ...$paths];
            }
        };
        $directory = $user->can('phase-one.view');
        $add($directory && $roles(['Branch Manager', 'Sales Officer']), [
            '/administration/stands', '/administration/stands/map', '/administration/clients', '/administration/stand-allocations',
        ]);
        $add($directory && $roles(['Accounts Officer', 'Cashier', 'Auditor']), ['/administration/clients']);
        $add($directory && $admin && $user->can('phase-one.manage'), ['/administration/data-import']);
        $add($directory && $roles(['Accounts Officer', 'Auditor']) && $user->can('accounting.view'), [
            '/accounting', '/accounting/control-centre', '/accounting/daily-activity', '/accounting/cash-movement', '/accounting/debtors', '/accounting/interest-review', '/accounting/general-ledger', '/accounting/financial-reports', '/accounting/payables', '/accounting/supplier-reconciliation', '/accounting/tax-report', '/accounting/master-data', '/accounting/settings',
        ]);
        $add($directory && $roles(['Branch Manager', 'Accounts Officer', 'Auditor']), ['/administration/account-charges', '/administration/payment-allocations']);
        $add($directory && $roles(['Branch Manager', 'Accounts Officer', 'Cashier', 'Auditor']), ['/administration/payments', '/administration/receipts']);
        $add($directory && $roles(['Branch Manager', 'Accounts Officer', 'Cashier', 'Auditor']), ['/administration/cash-sessions', '/administration/bank-deposits']);
        $add($directory && $roles(['Branch Manager', 'Accounts Officer', 'Auditor']), ['/administration/reconciliation-runs']);
        $add($directory && $roles(['Branch Manager', 'Accounts Officer', 'Cashier', 'Auditor']) && $user->can('expenses.view'), ['/administration/expenses', '/administration/petty-cash-entries']);
        $add($directory && $roles(['Branch Manager', 'Auditor']) && $user->can('expenses.view'), ['/approvals']);
        $add($directory && $roles(['Branch Manager', 'Accounts Officer', 'Auditor']) && $user->can('reports.view'), ['/reports']);
        $callCentre = $roles(['Branch Manager', 'Accounts Officer', 'Sales Officer', 'Call Centre', 'Auditor']) && $user->can('call-centre.view');
        $add($callCentre, ['/call-centre']);
        $add($callCentre && $user->can('call-centre.tasks.manage'), ['/call-centre/queue']);
        $add($callCentre && $user->can('call-centre.campaigns.manage'), ['/call-centre/campaigns']);
        $add($callCentre && $user->can('call-centre.campaigns.manage'), ['/call-centre/bulk-sms']);
        $add($callCentre && $user->can('call-centre.reports.view'), ['/call-centre/reports']);
        $add($directory && $admin && $user->can('phase-one.manage'), array_map(fn ($path) => '/administration'.$path, [
            '', '/organizations', '/branches', '/users', '/roles', '/permissions', '/system-settings', '/document-sequences',
            '/currencies', '/exchange-rates', '/payment-methods', '/bank-accounts', '/expense-categories',
            '/developments', '/development-phases', '/stand-types',
        ]));
        $add(app(RoleAuditAccess::class)->canView($user), ['/administration/audit-events']);

        return array_values(array_unique($urls));
    }
}
