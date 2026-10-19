<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\ClientAccount;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AccountingService
{
    public const BUCKETS = [
        ['key' => 'current', 'label' => 'Current'],
        ['key' => '30', 'label' => '30 days'],
        ['key' => '60', 'label' => '60 days'],
        ['key' => '90', 'label' => '90 days'],
        ['key' => '120', 'label' => '120 days'],
        ['key' => '150', 'label' => '150 days'],
        ['key' => '180', 'label' => '180+ days'],
    ];

    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function dashboard(User $user, ?int $activeBranchId = null): array
    {
        $receivables = $this->receivables($user, $activeBranchId);
        $currency = $receivables['currency'];
        $branchIds = $this->accessibleBranchIds($user, $activeBranchId);
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

    public function receivables(User $user, ?int $activeBranchId = null): array
    {
        $organizationId = (int) $user->organization_id;
        $currency = $user->organization?->base_currency_code ?: 'USD';
        $branchIds = $this->accessibleBranchIds($user, $activeBranchId);

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
        $over90 = (float) $aging
            ->whereIn('key', ['120', '150', '180'])
            ->sum('total');

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

    /**
     * Build a customer statement in the same debit, credit, running-balance and
     * seven-period ageing structure used by the supplied statement reference.
     */
    public function debtorStatementForAccount(User $user, int $accountId, ?int $activeBranchId = null): ?array
    {
        $branchIds = $this->accessibleBranchIds($user, $activeBranchId);
        $account = ClientAccount::query()
            ->whereKey($accountId)
            ->whereHas('clientFile.client', fn (Builder $query) => $query->where('organization_id', $user->organization_id))
            ->when($branchIds !== null, fn (Builder $query) => $query
                ->whereHas('clientFile', fn (Builder $file) => $file->whereIn('branch_id', $branchIds)))
            ->with(['clientFile.client', 'clientFile.branch'])
            ->first();

        if (! $account) {
            return null;
        }

        $charges = AccountCharge::query()
            ->where('account_id', $account->id)
            ->whereIn('status', ['posted', 'partially_paid', 'paid'])
            ->withSum([
                'paymentAllocations as allocated_amount' => fn (Builder $query) => $query
                    ->whereHas('payment', fn (Builder $payment) => $payment->where('status', 'approved')),
            ], 'amount')
            ->get();
        $aging = collect(self::BUCKETS)->mapWithKeys(fn (array $bucket) => [$bucket['key'] => 0.0])->all();
        $outstanding = 0.0;
        $daysOverdue = 0;

        foreach ($charges as $charge) {
            $balance = max(0, (float) $charge->amount - (float) ($charge->allocated_amount ?? 0));
            if ($balance <= 0) {
                continue;
            }
            $chargeDays = $charge->due_date && $charge->due_date->isBefore(today())
                ? (int) $charge->due_date->diffInDays(today())
                : 0;
            $outstanding += $balance;
            $daysOverdue = max($daysOverdue, $chargeDays);
            $aging[$this->bucketKey($chargeDays)] += $balance;
        }

        $lastPayment = Payment::query()
            ->where('account_id', $account->id)
            ->where('status', 'approved')
            ->max('received_at');
        $client = $account->clientFile?->client;

        return $this->debtorStatement($user, $account->id, [
            'account_id' => $account->id,
            'account_no' => $account->account_no,
            'client_no' => $client?->client_no,
            'client' => trim("{$client?->first_name} {$client?->last_name}"),
            'phone' => $client?->phone_normalized,
            'branch' => $account->clientFile?->branch?->name,
            'file_no' => $account->clientFile?->file_no,
            'currency' => $account->currency_code,
            'outstanding' => $outstanding,
            'aging' => $aging,
            'days_overdue' => $daysOverdue,
            'oldest_due_date' => null,
            'last_payment_at' => $lastPayment,
            'open_charges' => $charges->count(),
        ], $activeBranchId);
    }

    public function debtorStatement(User $user, int $accountId, array $debtor, ?int $activeBranchId = null): ?array
    {
        $branchIds = $this->accessibleBranchIds($user, $activeBranchId);
        $account = ClientAccount::query()
            ->whereKey($accountId)
            ->whereHas('clientFile.client', fn (Builder $query) => $query
                ->where('organization_id', $user->organization_id))
            ->when($branchIds !== null, fn (Builder $query) => $query
                ->whereHas('clientFile', fn (Builder $file) => $file->whereIn('branch_id', $branchIds)))
            ->with([
                'clientFile.branch:id,organization_id,code,name,address,phone,email',
                'clientFile.branch.organization:id,legal_name,trading_name',
                'clientFile.client:id,client_no,first_name,middle_names,last_name,phone_normalized',
                'clientFile.client.contacts:id,client_id,type,normalized_value,is_primary',
            ])
            ->first();

        if (! $account) {
            return null;
        }

        $charges = AccountCharge::query()
            ->where('account_id', $account->id)
            ->whereIn('status', ['posted', 'partially_paid', 'paid'])
            ->orderBy('posted_at')
            ->orderBy('id')
            ->get()
            ->map(fn (AccountCharge $charge): array => [
                'sort_at' => ($charge->posted_at ?? $charge->created_at)->toIso8601String(),
                'sort_order' => 0,
                'date' => ($charge->posted_at ?? $charge->created_at)->toDateString(),
                'reference' => 'CHG'.str_pad((string) $charge->id, 6, '0', STR_PAD_LEFT),
                'description' => $charge->description ?: Str::headline($charge->charge_type),
                'allocated_to' => null,
                'debit' => (float) $charge->amount,
                'credit' => 0.0,
            ]);

        $payments = Payment::query()
            ->where('account_id', $account->id)
            ->where('status', 'approved')
            ->with(['method:id,name', 'allocations.charge:id,description'])
            ->orderBy('received_at')
            ->orderBy('id')
            ->get()
            ->map(function (Payment $payment): array {
                $allocatedTo = $payment->allocations
                    ->map(fn ($allocation): ?string => $allocation->charge?->description)
                    ->filter()
                    ->unique()
                    ->implode(', ');

                return [
                    'sort_at' => $payment->received_at->toIso8601String(),
                    'sort_order' => 1,
                    'date' => $payment->received_at->toDateString(),
                    'reference' => $payment->external_reference ?: 'REC'.str_pad((string) $payment->id, 6, '0', STR_PAD_LEFT),
                    'description' => $payment->method?->name ? $payment->method->name.' receipt' : 'Payment received',
                    'allocated_to' => $allocatedTo ?: null,
                    'debit' => 0.0,
                    'credit' => (float) $payment->amount,
                ];
            });

        $balance = 0.0;
        $transactions = $charges
            ->concat($payments)
            ->sortBy([['sort_at', 'asc'], ['sort_order', 'asc']])
            ->values()
            ->map(function (array $transaction) use (&$balance): array {
                $balance += $transaction['debit'] - $transaction['credit'];
                unset($transaction['sort_at'], $transaction['sort_order']);

                return [...$transaction, 'balance' => $balance];
            });

        $client = $account->clientFile?->client;
        $branch = $account->clientFile?->branch;
        $organization = $branch?->organization ?? $user->organization;
        $customerAddress = $client?->contacts
            ?->first(fn ($contact): bool => $contact->type === 'address' && $contact->is_primary)
            ?->normalized_value
            ?? $client?->contacts?->firstWhere('type', 'address')?->normalized_value;

        return [
            'organization' => [
                'name' => $organization?->legal_name ?: $organization?->trading_name ?: 'Organization',
                'branch' => $branch?->name,
                'address' => $branch?->address,
                'telephone' => $branch?->phone,
                'email' => $branch?->email,
            ],
            'customer' => [
                'account_no' => $account->account_no,
                'client_no' => $client?->client_no,
                'name' => trim(implode(' ', array_filter([$client?->first_name, $client?->middle_names, $client?->last_name]))),
                'address' => $customerAddress,
                'phone' => $client?->phone_normalized,
            ],
            'statement_date' => today()->toDateString(),
            'currency' => $account->currency_code,
            'status' => $debtor['days_overdue'] > 0 ? 'Overdue' : 'Current',
            'amount_due' => (float) $debtor['outstanding'],
            'last_payment_at' => $debtor['last_payment_at'],
            'transactions' => $transactions,
            'aging' => collect(self::BUCKETS)
                ->reverse()
                ->values()
                ->map(fn (array $bucket): array => [
                    ...$bucket,
                    'total' => (float) ($debtor['aging'][$bucket['key']] ?? 0),
                ]),
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

    private function accessibleBranchIds(User $user, ?int $activeBranchId): ?Collection
    {
        if ($activeBranchId && $this->branchAccess->availableBranches($user)->contains('id', $activeBranchId)) {
            return collect([$activeBranchId]);
        }

        return $this->branchAccess->branchIds($user);
    }

    private function bucketKey(int $daysOverdue): string
    {
        return match (true) {
            $daysOverdue <= 0 => 'current',
            $daysOverdue <= 30 => '30',
            $daysOverdue <= 60 => '60',
            $daysOverdue <= 90 => '90',
            $daysOverdue <= 120 => '120',
            $daysOverdue <= 150 => '150',
            default => '180',
        };
    }
}
