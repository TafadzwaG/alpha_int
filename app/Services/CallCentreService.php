<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\Branch;
use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class CallCentreService
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function branchOptions(User $user): Collection
    {
        return $this->branchAccess->availableBranches($user)->map(fn (Branch $branch) => [
            'value' => (string) $branch->id,
            'label' => $branch->name,
            'code' => $branch->code,
        ])->values();
    }

    public function eligibleAgents(int $branchId): Collection
    {
        return User::query()
            ->where('status', 'active')
            ->whereHas('branchAccess', fn (Builder $query) => $query->where('branch_id', $branchId)->where('active', true))
            ->orderBy('name')
            ->get()
            ->filter(fn (User $user) => $user->can('call-centre.view'))
            ->values();
    }

    public function eligibleAgentOptions(int $branchId): array
    {
        return $this->eligibleAgents($branchId)
            ->map(fn (User $user) => ['value' => (string) $user->id, 'label' => $user->name])
            ->all();
    }

    public function resolveAssignee(User $actor, int $branchId, ?int $requestedUserId = null): int
    {
        $eligible = $this->eligibleAgents($branchId);
        $assigneeId = $requestedUserId ?: $actor->id;

        if ($eligible->contains('id', $assigneeId)) {
            return $assigneeId;
        }

        abort_if($requestedUserId !== null, 422, 'The assignee cannot access this branch.');

        return (int) ($eligible->first()?->id ?? abort(422, 'No eligible call-centre agent is assigned to this branch.'));
    }

    public function selectedBranch(Request $request): Branch
    {
        $branchId = (int) ($request->integer('branch') ?: $request->session()->get(BranchAccessService::SESSION_KEY));
        abort_unless($branchId && $this->branchAccess->canAccess($request->user(), $branchId), 404);

        return Branch::query()->whereKey($branchId)->where('organization_id', $request->user()->organization_id)->firstOrFail();
    }

    public function authorizeClient(User $user, Client $client): void
    {
        abort_unless((int) $client->organization_id === (int) $user->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($user, (int) $client->owning_branch_id), 404);
    }

    public function clientSearch(User $user, int $branchId, string $search, int $limit = 12): Collection
    {
        return Client::query()
            ->where('organization_id', $user->organization_id)
            ->where('owning_branch_id', $branchId)
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $builder) use ($search) {
                $builder->where('client_no', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('search_name', 'like', "%{$search}%")
                    ->orWhere('phone_normalized', 'like', "%{$search}%")
                    ->orWhereHas('files.allocations.stand', fn (Builder $stand) => $stand->where('stand_no', 'like', "%{$search}%"));
            }))
            ->with(['owningBranch:id,name,code', 'files.allocations.stand:id,stand_no'])
            ->orderBy('search_name')
            ->limit($limit)
            ->get()
            ->map(fn (Client $client) => $this->clientSummary($client));
    }

    public function clientSummary(Client $client): array
    {
        $financial = $this->financialSummary($client);

        return [
            'id' => $client->id,
            'clientNo' => $client->client_no,
            'name' => trim("{$client->first_name} {$client->middle_names} {$client->last_name}"),
            'phone' => $client->phone_normalized,
            'status' => $client->status,
            'branch' => $client->owningBranch?->name,
            'standNumbers' => $client->files->flatMap->allocations->pluck('stand.stand_no')->filter()->unique()->values(),
            ...$financial,
        ];
    }

    public function financialSummary(Client $client): array
    {
        $charges = $this->chargesForClient($client);
        $outstanding = $charges->sum('outstanding');
        $oldestDays = (int) $charges->where('outstanding', '>', 0)->max('daysOverdue');

        return [
            'outstanding' => round($outstanding, 2),
            'daysOverdue' => max(0, $oldestDays),
            'agingBucket' => $this->bucketForDays($oldestDays),
            'currency' => $client->organization?->base_currency_code ?? 'USD',
        ];
    }

    public function chargesForClient(Client $client): Collection
    {
        return AccountCharge::query()
            ->whereHas('account.clientFile', fn (Builder $query) => $query->where('client_id', $client->id))
            ->whereNot('status', 'void')
            ->with(['paymentAllocations.payment:id,status'])
            ->get()
            ->map(function (AccountCharge $charge) {
                $paid = (float) $charge->paymentAllocations
                    ->filter(fn ($allocation) => $allocation->payment?->status === 'approved')
                    ->sum('amount');
                $days = $charge->due_date?->isPast() ? $charge->due_date->diffInDays(today()) : 0;

                return [
                    'id' => $charge->id,
                    'description' => $charge->description,
                    'dueDate' => $charge->due_date?->toDateString(),
                    'amount' => (float) $charge->amount,
                    'paid' => $paid,
                    'outstanding' => max(0, (float) $charge->amount - $paid),
                    'daysOverdue' => $days,
                    'currency' => $charge->currency_code,
                    'status' => $charge->status,
                ];
            });
    }

    public function debtorClientIds(int $branchId, string $bucket): Collection
    {
        return Client::query()
            ->where('owning_branch_id', $branchId)
            ->with(['organization:id,base_currency_code', 'files.accounts.charges.paymentAllocations.payment:id,status'])
            ->get()
            ->filter(function (Client $client) use ($bucket) {
                $summary = $this->financialSummary($client);

                return $summary['outstanding'] > 0 && ($bucket === 'all' || $summary['agingBucket'] === $bucket);
            })
            ->pluck('id');
    }

    public function bucketForDays(int $days): string
    {
        return match (true) {
            $days <= 0 => 'current',
            $days <= 30 => '1_30',
            $days <= 60 => '31_60',
            $days <= 90 => '61_90',
            default => '90_plus',
        };
    }
}
