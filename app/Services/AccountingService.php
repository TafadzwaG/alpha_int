<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\Payment;
use App\Models\User;
use App\Models\UserBranchAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class AccountingService
{
    public const BUCKETS = [
        ['key' => 'current', 'label' => 'Current'],
        ['key' => '1-30', 'label' => '1–30 days'],
        ['key' => '31-60', 'label' => '31–60 days'],
        ['key' => '61-90', 'label' => '61–90 days'],
        ['key' => '90-plus', 'label' => '90+ days'],
    ];

    public function dashboard(User $user): array
    {
        $receivables = $this->receivables($user);
        $currency = $receivables['currency'];
        $branchIds = $this->accessibleBranchIds($user);
        $organizationId = (int) $user->organization_id;

        $monthly = collect(range(5, 0))->map(function (int $offset) use ($organizationId, $currency, $branchIds) {
            $month = now()->startOfMonth()->subMonths($offset);
            $range = [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()];

            return [
                'month' => $month->format('M'),
                'label' => $month->format('F Y'),
                'billed' => (float) $this->chargeQuery($organizationId, $currency, $branchIds)
                    ->whereBetween('posted_at', $range)
                    ->sum('amount'),
                'collected' => (float) $this->paymentQuery($organizationId, $currency, $branchIds)
                    ->whereBetween('received_at', $range)
                    ->sum('amount'),
            ];
        });

        $payments = $this->paymentQuery($organizationId, $currency, $branchIds)
            ->withSum('allocations as allocated_amount', 'amount')
            ->get();
        $unallocatedReceipts = $payments->sum(fn (Payment $payment): float => max(0, (float) $payment->amount - (float) ($payment->allocated_amount ?? 0)));
        $sixMonthBilled = (float) $monthly->sum('billed');
        $sixMonthCollected = (float) $monthly->sum('collected');

        return [
            ...$receivables,
            'summary' => [
                ...$receivables['summary'],
                'unallocatedReceipts' => $unallocatedReceipts,
                'collectionRate' => $sixMonthBilled > 0 ? round(($sixMonthCollected / $sixMonthBilled) * 100, 1) : 0,
            ],
            'monthly' => $monthly,
            'topDebtors' => $receivables['debtors']->take(8)->values(),
            'recentPayments' => $this->paymentQuery($organizationId, $currency, $branchIds)
                ->with(['account.clientFile.client:id,client_no,first_name,last_name', 'branch:id,name', 'method:id,name'])
                ->latest('received_at')
                ->limit(6)
                ->get()
                ->map(fn (Payment $payment): array => [
                    'id' => $payment->id,
                    'client' => trim("{$payment->account?->clientFile?->client?->first_name} {$payment->account?->clientFile?->client?->last_name}"),
                    'account_no' => $payment->account?->account_no,
                    'branch' => $payment->branch?->name,
                    'method' => $payment->method?->name,
                    'amount' => (float) $payment->amount,
                    'received_at' => $payment->received_at?->toIso8601String(),
                ]),
            'generatedAt' => now()->toIso8601String(),
        ];
    }

    public function receivables(User $user): array
    {
        $organizationId = (int) $user->organization_id;
        $currency = $user->organization?->base_currency_code ?: 'USD';
        $branchIds = $this->accessibleBranchIds($user);

        $charges = $this->chargeQuery($organizationId, $currency, $branchIds)
            ->with([
                'account:id,client_file_id,account_no,currency_code,status',
                'account.clientFile:id,client_id,branch_id,file_no',
                'account.clientFile.client:id,client_no,first_name,last_name,phone_normalized',
                'account.clientFile.branch:id,name',
            ])
            ->withSum([
                'paymentAllocations as allocated_amount' => fn (Builder $query) => $query
                    ->whereHas('payment', fn (Builder $payment) => $payment->where('status', 'approved')),
            ], 'amount')
            ->get();

        $lastPayments = $this->paymentQuery($organizationId, $currency, $branchIds)
            ->selectRaw('account_id, MAX(received_at) as last_payment_at')
            ->groupBy('account_id')
            ->pluck('last_payment_at', 'account_id');

        $chargeRows = $charges
            ->map(function (AccountCharge $charge): ?array {
                $outstanding = max(0, (float) $charge->amount - (float) ($charge->allocated_amount ?? 0));
                if ($outstanding <= 0) {
                    return null;
                }

                $daysOverdue = $charge->due_date && $charge->due_date->isBefore(today())
                    ? (int) $charge->due_date->diffInDays(today())
                    : 0;

                return [
                    'account_id' => $charge->account_id,
                    'outstanding' => $outstanding,
                    'bucket' => $this->bucketKey($daysOverdue),
                    'days_overdue' => $daysOverdue,
                    'due_date' => $charge->due_date?->toDateString(),
                    'account' => $charge->account,
                ];
            })
            ->filter();

        $debtors = $chargeRows
            ->groupBy('account_id')
            ->map(function (Collection $rows, int|string $accountId) use ($lastPayments): array {
                $first = $rows->first();
                $account = $first['account'];
                $client = $account->clientFile?->client;
                $aging = collect(self::BUCKETS)->mapWithKeys(fn (array $bucket): array => [
                    $bucket['key'] => (float) $rows->where('bucket', $bucket['key'])->sum('outstanding'),
                ])->all();
                $oldestDueDate = $rows->pluck('due_date')->filter()->sort()->first();

                return [
                    'account_id' => (int) $accountId,
                    'account_no' => $account->account_no,
                    'client_no' => $client?->client_no,
                    'client' => trim("{$client?->first_name} {$client?->last_name}"),
                    'phone' => $client?->phone_normalized,
                    'branch' => $account->clientFile?->branch?->name,
                    'file_no' => $account->clientFile?->file_no,
                    'currency' => $account->currency_code,
                    'outstanding' => (float) $rows->sum('outstanding'),
                    'aging' => $aging,
                    'days_overdue' => (int) $rows->max('days_overdue'),
                    'oldest_due_date' => $oldestDueDate,
                    'last_payment_at' => $lastPayments[$accountId] ?? null,
                    'open_charges' => $rows->count(),
                ];
            })
            ->sortByDesc('outstanding')
            ->values();

        $aging = collect(self::BUCKETS)->map(function (array $bucket) use ($debtors): array {
            return [
                ...$bucket,
                'total' => (float) $debtors->sum(fn (array $debtor): float => $debtor['aging'][$bucket['key']]),
                'accounts' => $debtors->filter(fn (array $debtor): bool => $debtor['aging'][$bucket['key']] > 0)->count(),
            ];
        })->values();

        $totalReceivables = (float) $debtors->sum('outstanding');
        $current = (float) ($aging->firstWhere('key', 'current')['total'] ?? 0);
        $over90 = (float) ($aging->firstWhere('key', '90-plus')['total'] ?? 0);

        return [
            'currency' => $currency,
            'summary' => [
                'totalReceivables' => $totalReceivables,
                'overdueReceivables' => max(0, $totalReceivables - $current),
                'over90' => $over90,
                'debtorCount' => $debtors->count(),
                'overdueDebtorCount' => $debtors->filter(fn (array $debtor): bool => $debtor['days_overdue'] > 0)->count(),
            ],
            'aging' => $aging,
            'debtors' => $debtors,
        ];
    }

    private function chargeQuery(int $organizationId, string $currency, ?Collection $branchIds): Builder
    {
        return AccountCharge::query()
            ->whereHas('account.clientFile.client', fn (Builder $query) => $query->where('organization_id', $organizationId))
            ->where('currency_code', $currency)
            ->whereIn('status', ['posted', 'partially_paid'])
            ->when($branchIds !== null, fn (Builder $query) => $query
                ->whereHas('account.clientFile', fn (Builder $file) => $file->whereIn('branch_id', $branchIds)));
    }

    private function paymentQuery(int $organizationId, string $currency, ?Collection $branchIds): Builder
    {
        return Payment::query()
            ->whereHas('account.clientFile.client', fn (Builder $query) => $query->where('organization_id', $organizationId))
            ->where('currency_code', $currency)
            ->where('status', 'approved')
            ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('branch_id', $branchIds));
    }

    private function accessibleBranchIds(User $user): ?Collection
    {
        if ($user->can('phase-one.manage')) {
            return null;
        }

        return UserBranchAccess::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->where(fn (Builder $query) => $query->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('valid_to')->orWhere('valid_to', '>=', now()))
            ->pluck('branch_id');
    }

    private function bucketKey(int $daysOverdue): string
    {
        return match (true) {
            $daysOverdue <= 0 => 'current',
            $daysOverdue <= 30 => '1-30',
            $daysOverdue <= 60 => '31-60',
            $daysOverdue <= 90 => '61-90',
            default => '90-plus',
        };
    }
}
