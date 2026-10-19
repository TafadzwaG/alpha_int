<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Services\BranchAccessService;
use App\Services\SidebarNavigation;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Lab404\Impersonate\Services\ImpersonateManager;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $activeBranch = null;
        $impersonation = app(ImpersonateManager::class);

        if ($request->user() && $request->session()->has(BranchAccessService::SESSION_KEY)) {
            $activeBranch = app(BranchAccessService::class)
                ->availableBranches($request->user())
                ->firstWhere('id', (int) $request->session()->get(BranchAccessService::SESSION_KEY));
        }

        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
                'navigationUrls' => fn () => $request->user() ? app(SidebarNavigation::class)->urls($request->user()) : [],
                'permissions' => fn () => $request->user()?->getAllPermissions()->pluck('name')->values() ?? [],
            ],
            'branchContext' => [
                'active' => $activeBranch instanceof Branch ? [
                    'id' => $activeBranch->id,
                    'code' => $activeBranch->code,
                    'name' => $activeBranch->name,
                ] : null,
            ],
            'impersonation' => [
                'active' => $impersonation->isImpersonating(),
                'impersonator' => fn () => $impersonation->isImpersonating()
                    ? $impersonation->getImpersonator()?->only(['id', 'name', 'email'])
                    : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
            ],
        ]);
    }
}
