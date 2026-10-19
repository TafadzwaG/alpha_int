<?php

namespace App\Http\Middleware;

use App\Services\BranchAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveBranch
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function handle(Request $request, Closure $next): Response
    {
        $branchId = (int) $request->session()->get(BranchAccessService::SESSION_KEY, 0);
        $branchIsAvailable = $branchId > 0
            && $this->branchAccess->availableBranches($request->user())->contains('id', $branchId);

        if (! $branchIsAvailable) {
            $request->session()->forget(BranchAccessService::SESSION_KEY);

            return to_route('branch-selection.index');
        }

        return $next($request);
    }
}
