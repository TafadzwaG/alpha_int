<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class RoleAuditAccess
{
    public function canView(User $user): bool
    {
        return $user->can('audit.view') || ($user->hasAnyRole(['Branch Manager', 'Accounts Officer', 'Cashier', 'Sales Officer', 'Call Centre'])
            && ($user->can('phase-one.view') || $user->can('call-centre.view')));
    }

    public function query(User $user): Builder
    {
        $query = AuditEvent::where('organization_id', $user->organization_id);
        if (! $user->can('phase-one.manage')) {
            $query->whereIn('branch_id', app(BranchAccessService::class)->availableBranches($user)->pluck('id'));
        }
        if ($user->can('audit.view')) {
            return $query;
        }
        $mapping = [
            'clients' => ['Client', 'ClientContact', 'ClientFile'],
            'stands' => ['Stand'], 'stand-allocations' => ['StandAllocation', 'Installment', 'InstallmentReminder'],
            'developments' => ['Development'], 'development-phases' => ['DevelopmentPhase'], 'stand-types' => ['StandType'],
            'payments' => ['Payment'], 'receipts' => ['Receipt'], 'account-charges' => ['AccountCharge'],
            'payment-allocations' => ['PaymentAllocation'], 'cash-sessions' => ['CashSession', 'CashSessionCount'],
            'bank-deposits' => ['BankDeposit'], 'reconciliation-runs' => ['ReconciliationRun'],
            'expenses' => ['Expense', 'ExpenseLine'], 'petty-cash-entries' => ['PettyCashEntry'],
        ];
        $urls = app(SidebarNavigation::class)->urls($user);
        $types = [];
        foreach ($mapping as $path => $models) {
            if (in_array('/administration/'.$path, $urls, true)) {
                $types = [...$types, ...$models];
            }
        }
        if (in_array('/call-centre', $urls, true)) {
            $types = [...$types, 'ClientInteraction', 'FollowUpTask', 'PromiseToPay'];
        }
        if (in_array('/call-centre/campaigns', $urls, true)) {
            $types[] = 'CallCentreCampaign';
        }
        $query->whereIn('subject_type', array_unique($types));
        if ($user->hasAnyRole(['Sales Officer', 'Call Centre']) && ! $user->hasAnyRole(['Branch Manager', 'Accounts Officer', 'Cashier'])) {
            $query->where('actor_id', $user->id);
        }

        return $query;
    }

    public function payload(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }
        foreach ($data as $key => $value) {
            if (preg_match('/password|token|secret|national_id|recovery|private_key/i', (string) $key)) {
                unset($data[$key]);
            } elseif (is_array($value)) {
                $data[$key] = $this->payload($value);
            }
        }

        return $data;
    }
}
