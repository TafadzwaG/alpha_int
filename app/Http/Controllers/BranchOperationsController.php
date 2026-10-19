<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Payment;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\User;
use App\Services\BranchAccessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BranchOperationsController extends Controller
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function show(Request $request, Branch $branch): Response
    {
        abort_unless((int) $branch->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $branch->id), 404);

        $activeAccess = fn ($query) => $query
            ->where('branch_id', $branch->id)
            ->where('active', true)
            ->where(fn (Builder $builder) => $builder->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
            ->where(fn (Builder $builder) => $builder->whereNull('valid_to')->orWhere('valid_to', '>=', now()));

        $users = User::query()
            ->where('organization_id', $branch->organization_id)
            ->where(fn (Builder $query) => $query
                ->where('home_branch_id', $branch->id)
                ->orWhereHas('branchAccess', $activeAccess))
            ->with([
                'roles:id,name',
                'branchAccess' => $activeAccess,
            ])
            ->orderBy('name')
            ->get();

        $branchAllocations = StandAllocation::query()->where('branch_id', $branch->id);
        $currentAllocations = (clone $branchAllocations)
            ->whereNotNull('stand_id')
            ->where('status', '!=', 'cancelled');
        $standIds = (clone $currentAllocations)->distinct()->pluck('stand_id');
        $baseCurrency = $request->user()->organization?->base_currency_code ?? 'USD';

        $allocationStatusCounts = (clone $branchAllocations)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');
        $standStatusCounts = Stand::query()
            ->whereIn('id', $standIds)
            ->selectRaw('physical_status, COUNT(*) as aggregate')
            ->groupBy('physical_status')
            ->pluck('aggregate', 'physical_status');

        $allocations = (clone $currentAllocations)
            ->with([
                'stand.phase.development:id,name,code',
                'stand.standType:id,name',
                'clientFile.client:id,client_no,first_name,middle_names,last_name',
            ])
            ->latest('allocated_at')
            ->latest('id')
            ->limit(20)
            ->get();

        return Inertia::render('administration/branches/show', [
            'branch' => [
                'id' => $branch->id,
                'code' => $branch->code,
                'name' => $branch->name,
                'timezone' => $branch->timezone,
                'address' => $branch->address,
                'phone' => $branch->phone,
                'email' => $branch->email,
                'status' => $branch->status,
            ],
            'summary' => [
                'users' => $users->count(),
                'activeUsers' => $users->where('status', 'active')->count(),
                'stands' => $standIds->count(),
                'clients' => (clone $currentAllocations)->distinct()->count('client_file_id'),
                'portfolioValue' => (float) (clone $currentAllocations)
                    ->where(fn (Builder $query) => $query->where('currency_code', $baseCurrency)->orWhereNull('currency_code'))
                    ->sum('effective_price'),
                'collections' => (float) Payment::query()
                    ->where('branch_id', $branch->id)
                    ->where('status', 'approved')
                    ->where('currency_code', $baseCurrency)
                    ->sum('amount'),
                'currency' => $baseCurrency,
            ],
            'allocationChart' => collect(['pending', 'approved', 'allocated', 'cancelled'])->map(fn (string $status) => [
                'status' => $status,
                'label' => str($status)->headline()->toString(),
                'count' => (int) ($allocationStatusCounts[$status] ?? 0),
            ]),
            'standChart' => collect(['planned', 'available', 'reserved', 'allocated', 'withdrawn'])->map(fn (string $status, int $index) => [
                'status' => $status,
                'label' => str($status)->headline()->toString(),
                'count' => (int) ($standStatusCounts[$status] ?? 0),
                'color' => 'var(--chart-'.(($index % 5) + 1).')',
            ]),
            'users' => $users->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->values(),
                'accessLevel' => $user->branchAccess->first()?->access_level ?? ($user->home_branch_id === $branch->id ? 'home branch' : 'operational'),
                'isHomeBranch' => (int) $user->home_branch_id === (int) $branch->id,
                'status' => $user->status,
            ])->values(),
            'stands' => $allocations->map(fn (StandAllocation $allocation) => [
                'allocationId' => $allocation->id,
                'standId' => $allocation->stand?->id,
                'standNo' => $allocation->stand?->stand_no,
                'development' => $allocation->stand?->phase?->development?->name,
                'standType' => $allocation->stand?->standType?->name,
                'physicalStatus' => $allocation->stand?->physical_status,
                'clientId' => $allocation->clientFile?->client?->id,
                'clientNo' => $allocation->clientFile?->client?->client_no,
                'client' => trim("{$allocation->clientFile?->client?->first_name} {$allocation->clientFile?->client?->middle_names} {$allocation->clientFile?->client?->last_name}"),
                'allocatedAt' => $allocation->allocated_at?->toDateString(),
                'price' => (float) ($allocation->effective_price ?? 0),
                'currency' => $allocation->currency_code ?? $baseCurrency,
                'allocationStatus' => $allocation->status,
            ])->values(),
        ]);
    }
}
