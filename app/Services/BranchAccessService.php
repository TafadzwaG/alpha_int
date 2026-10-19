<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\User;
use App\Models\UserBranchAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class BranchAccessService
{
    public const SESSION_KEY = 'active_branch_id';

    public function branchIds(User $user): ?Collection
    {
        if ($user->can('phase-one.manage')) {
            return null;
        }

        return UserBranchAccess::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->where(fn (Builder $query) => $query->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('valid_to')->orWhere('valid_to', '>=', now()))
            ->whereHas('branch', fn (Builder $query) => $query->where('organization_id', $user->organization_id))
            ->pluck('branch_id');
    }

    public function availableBranches(User $user): Collection
    {
        $branchIds = $this->branchIds($user);

        return Branch::query()
            ->where('organization_id', $user->organization_id)
            ->where('status', 'active')
            ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('id', $branchIds))
            ->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [$user->home_branch_id ?? 0])
            ->orderBy('name')
            ->get();
    }

    public function canAccess(User $user, int $branchId): bool
    {
        $belongsToOrganization = Branch::query()
            ->whereKey($branchId)
            ->where('organization_id', $user->organization_id)
            ->exists();

        if (! $belongsToOrganization) {
            return false;
        }

        $branchIds = $this->branchIds($user);

        return $branchIds === null || $branchIds->contains($branchId);
    }
}
