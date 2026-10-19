<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Services\BranchAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BranchSelectionController extends Controller
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $activeBranchId = (int) $request->session()->get(BranchAccessService::SESSION_KEY, 0);

        return Inertia::render('auth/select-branch', [
            'branches' => $this->branchAccess->availableBranches($user)
                ->map(fn (Branch $branch) => [
                    'id' => $branch->id,
                    'code' => $branch->code,
                    'name' => $branch->name,
                    'address' => $branch->address,
                    'isHome' => (int) $user->home_branch_id === $branch->id,
                    'isCurrent' => $activeBranchId === $branch->id,
                ])
                ->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'integer'],
            'redirect_to' => ['nullable', 'string', 'in:/dashboard,/call-centre,/call-centre/queue,/call-centre/campaigns'],
        ]);

        $branch = $this->branchAccess->availableBranches($request->user())
            ->firstWhere('id', (int) $validated['branch_id']);

        if (! $branch) {
            throw ValidationException::withMessages([
                'branch_id' => 'You do not have access to that branch.',
            ]);
        }

        $request->session()->put(BranchAccessService::SESSION_KEY, $branch->id);

        if (! empty($validated['redirect_to'])) {
            return redirect($validated['redirect_to']);
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
