<?php

namespace App\Services;

use App\Models\ClientAccount;
use App\Models\InterestExemption;
use App\Models\InterestPolicy;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class InterestAssessmentService
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function policy(int $organizationId): InterestPolicy
    {
        return InterestPolicy::query()->firstOrCreate(
            ['organization_id' => $organizationId],
            [
                'name' => 'Standard overdue interest',
                'base_annual_rate' => 12,
                'grace_days' => 30,
                'merit_window_months' => 6,
                'merit_exemption_threshold' => 90,
                'merit_discount_threshold' => 75,
                'discounted_annual_rate' => 6,
                'minimum_overdue_balance' => 0,
                'active' => true,
            ],
        );
    }

    public function accounts(User $user): Collection
    {
        $branchIds = $this->branchAccess->branchIds($user);

        return ClientAccount::query()
            ->where('status', 'open')
            ->whereHas('clientFile.client', fn ($query) => $query->where('organization_id', $user->organization_id))
            ->when($branchIds !== null, fn ($query) => $query->whereHas('clientFile', fn ($files) => $files->whereIn('branch_id', $branchIds)))
            ->with([
                'clientFile.client:id,search_name,client_no',
                'clientFile.branch:id,name',
                'charges' => fn ($query) => $query->whereIn('status', ['posted', 'partially_paid', 'paid'])->with('paymentAllocations.payment'),
                'interestExemptions' => fn ($query) => $query->where('status', 'active')->latest('starts_on'),
            ])
            ->orderBy('account_no')
            ->get();
    }

    public function review(User $user): array
    {
        $policy = $this->policy((int) $user->organization_id);
        $today = today();
        $rows = $this->accounts($user)->map(fn (ClientAccount $account): array => $this->assess($account, $policy, $today));

        return [
            'policy' => $policy,
            'assessments' => $rows->values(),
            'summary' => [
                'accounts' => $rows->count(),
                'overdue_balance' => round((float) $rows->sum('overdue_balance'), 4),
                'estimated_interest' => round((float) $rows->sum('estimated_interest'), 4),
                'merit_exemptions' => $rows->whereIn('determination', ['merit_exempt', 'approved_exemption'])->count(),
                'discounted_accounts' => $rows->where('determination', 'merit_discount')->count(),
            ],
        ];
    }

    private function assess(ClientAccount $account, InterestPolicy $policy, CarbonInterface $today): array
    {
        $lookback = $today->copy()->subMonths((int) $policy->merit_window_months);
        $eligibleCharges = $account->charges->filter(fn ($charge) => $charge->due_date && $charge->due_date->between($lookback, $today));
        $settledOnTime = $eligibleCharges->filter(function ($charge) use ($policy): bool {
            $deadline = $charge->due_date->copy()->addDays((int) $policy->grace_days)->endOfDay();
            $allocated = $charge->paymentAllocations
                ->filter(fn ($allocation) => $allocation->payment?->status === 'approved' && $allocation->payment->received_at?->lte($deadline))
                ->sum(fn ($allocation) => (float) $allocation->amount);

            return $allocated + 0.0001 >= (float) $charge->amount;
        })->count();
        $meritScore = $eligibleCharges->isEmpty() ? null : round(($settledOnTime / $eligibleCharges->count()) * 100, 2);

        $exemption = $account->interestExemptions->first(fn (InterestExemption $item): bool => $item->starts_on->lte($today) && (! $item->ends_on || $item->ends_on->gte($today))
        );
        [$rate, $determination] = $this->determineRate($policy, $meritScore, $exemption);

        $overdueBalance = 0.0;
        $estimatedInterest = 0.0;
        $oldestDueDate = null;
        foreach ($account->charges as $charge) {
            if (! $charge->due_date) {
                continue;
            }
            $approvedAllocated = $charge->paymentAllocations
                ->filter(fn ($allocation) => $allocation->payment?->status === 'approved')
                ->sum(fn ($allocation) => (float) $allocation->amount);
            $balance = max(0, (float) $charge->amount - $approvedAllocated);
            $interestStarts = $charge->due_date->copy()->addDays((int) $policy->grace_days);
            if ($balance <= 0 || $interestStarts->gte($today)) {
                continue;
            }
            $overdueBalance += $balance;
            $days = $interestStarts->diffInDays($today);
            $estimatedInterest += $balance * ($rate / 100) * ($days / 365);
            if (! $oldestDueDate || $charge->due_date->lt($oldestDueDate)) {
                $oldestDueDate = $charge->due_date;
            }
        }
        if ($overdueBalance < (float) $policy->minimum_overdue_balance) {
            $estimatedInterest = 0;
        }

        return [
            'account_id' => $account->id,
            'account_no' => $account->account_no,
            'client' => $account->clientFile?->client?->search_name ?? 'Unknown client',
            'client_no' => $account->clientFile?->client?->client_no,
            'branch' => $account->clientFile?->branch?->name,
            'currency' => $account->currency_code,
            'merit_score' => $meritScore,
            'payments_reviewed' => $eligibleCharges->count(),
            'determined_rate' => round($rate, 4),
            'determination' => $determination,
            'overdue_balance' => round($overdueBalance, 4),
            'estimated_interest' => round($estimatedInterest, 4),
            'oldest_due_date' => $oldestDueDate?->toDateString(),
            'exemption' => $exemption ? [
                'id' => $exemption->id,
                'reason' => $exemption->reason,
                'rate_override' => (float) $exemption->rate_override,
                'starts_on' => $exemption->starts_on->toDateString(),
                'ends_on' => $exemption->ends_on?->toDateString(),
            ] : null,
        ];
    }

    private function determineRate(InterestPolicy $policy, ?float $meritScore, ?InterestExemption $exemption): array
    {
        if (! $policy->active) {
            return [0.0, 'policy_inactive'];
        }
        if ($exemption) {
            return [(float) $exemption->rate_override, 'approved_exemption'];
        }
        if ($meritScore !== null && $meritScore >= (float) $policy->merit_exemption_threshold) {
            return [0.0, 'merit_exempt'];
        }
        if ($meritScore !== null && $meritScore >= (float) $policy->merit_discount_threshold) {
            return [(float) $policy->discounted_annual_rate, 'merit_discount'];
        }

        return [(float) $policy->base_annual_rate, 'standard'];
    }
}
