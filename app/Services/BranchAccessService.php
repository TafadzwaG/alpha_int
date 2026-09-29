<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserBranchAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class BranchAccessService
{
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
            ->pluck('branch_id');
    }

    public function canAccess(User $user, int $branchId): bool
    {
        $branchIds = $this->branchIds($user);

        return $branchIds === null || $branchIds->contains($branchId);
    }
}
