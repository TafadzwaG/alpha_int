<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\UserBranchAccess;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\UserExportWorkbook;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Lab404\Impersonate\Services\ImpersonateManager;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserAdministrationController extends Controller
{
    private const ORIGINAL_BRANCH_SESSION_KEY = 'impersonation_original_branch_id';

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly UserExportWorkbook $workbooks,
        private readonly BranchAccessService $branchAccess,
    ) {}

    public function index(Request $request): Response
    {
        $organizationId = (int) $request->user()->organization_id;
        $usersQuery = $this->filteredUsers($request);
        $users = $usersQuery->paginate(20)->withQueryString()->through(
            fn (User $user) => $this->userSummary($user, $request),
        );
        $organizationUsers = $this->scopedUsers($request);

        return Inertia::render('administration/users/index', [
            'users' => $users,
            'stats' => [
                'total' => (clone $organizationUsers)->count(),
                'active' => (clone $organizationUsers)->where('status', 'active')->count(),
                'restricted' => (clone $organizationUsers)->whereIn('status', ['suspended', 'inactive'])->count(),
                'mfaProtected' => (clone $organizationUsers)->whereIn('mfa_state', ['required', 'enabled'])->count(),
            ],
            'filters' => [
                'search' => trim((string) $request->string('search')),
                'status' => $request->string('status')->toString() ?: 'all',
                'branch' => $request->integer('branch') ? (string) $request->integer('branch') : 'all',
            ],
            'branches' => $this->branchOptions($organizationId),
            'canManage' => $request->user()->can('phase-one.manage'),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorizeManagement($request);

        return Inertia::render('administration/users/invite', [
            'branches' => $this->branchOptions((int) $request->user()->organization_id),
            'roles' => $this->roleOptions((int) $request->user()->organization_id),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeManagement($request);
        $validated = $this->validateUser($request);
        $organizationId = (int) $request->user()->organization_id;

        /** @var User $user */
        $user = DB::transaction(function () use ($request, $validated, $organizationId) {
            $user = User::create([
                ...Arr::only($validated, ['name', 'email', 'home_branch_id', 'mfa_state']),
                'organization_id' => $organizationId,
                'password' => Str::password(40),
                'status' => 'active',
            ]);
            $this->syncAccess($user, $validated, $organizationId);
            $this->auditLogger->record($request, 'users.invited', $user, null, $this->userAuditData($user));

            return $user;
        });

        $status = Password::sendResetLink(['email' => $user->email]);

        if ($status !== Password::RESET_LINK_SENT) {
            return to_route('administration.users.show', $user)->withErrors(['email' => __($status)]);
        }

        return to_route('administration.users.show', $user)
            ->with('success', "{$user->name} was invited and received a password setup link.");
    }

    public function show(Request $request, User $user): Response
    {
        $this->authorizeUserScope($request, $user);
        $user->load(['homeBranch:id,name,code', 'roles:id,name,code', 'branchAccess.branch:id,name,code']);
        $canViewAudit = $request->user()->can('audit.view');

        return Inertia::render('administration/users/show', [
            'managedUser' => $this->userDetail($user),
            'branches' => $this->branchOptions((int) $request->user()->organization_id),
            'roles' => $this->roleOptions((int) $request->user()->organization_id),
            'canManage' => $request->user()->can('phase-one.manage'),
            'canImpersonate' => $this->canImpersonate($request, $user),
            'recentEvents' => $canViewAudit
                ? AuditEvent::query()
                    ->where('organization_id', $request->user()->organization_id)
                    ->where('subject_type', 'User')
                    ->where('subject_id', $user->id)
                    ->with('actor:id,name')
                    ->latest('occurred_at')
                    ->limit(10)
                    ->get()
                    ->map(fn (AuditEvent $event) => [
                        'id' => $event->id,
                        'event_type' => $event->event_type,
                        'actor' => $event->actor?->name ?? 'System',
                        'occurred_at' => $event->occurred_at?->toIso8601String(),
                    ])
                : [],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorizeManagement($request);
        $this->authorizeUserScope($request, $user);
        $validated = $this->validateUser($request, $user);
        $before = $this->userAuditData($user->load(['roles', 'branchAccess']));

        DB::transaction(function () use ($request, $user, $validated, $before) {
            $user->fill(Arr::only($validated, ['name', 'email', 'home_branch_id', 'mfa_state', 'status']))->save();
            $this->syncAccess($user, $validated, (int) $request->user()->organization_id);
            $this->auditLogger->record($request, 'users.updated', $user, $before, $this->userAuditData($user->fresh(['roles', 'branchAccess'])));
        });

        return back()->with('success', 'User profile and access assignments updated.');
    }

    public function sendPasswordReset(Request $request, User $user): RedirectResponse
    {
        $this->authorizeManagement($request);
        $this->authorizeUserScope($request, $user);
        $status = Password::sendResetLink(['email' => $user->email]);

        if ($status !== Password::RESET_LINK_SENT) {
            return back()->withErrors(['email' => __($status)]);
        }

        $this->auditLogger->record($request, 'users.password_reset_requested', $user, null, ['email' => $user->email]);

        return back()->with('success', "A password reset link was sent to {$user->email}.");
    }

    public function impersonate(Request $request, User $user, ImpersonateManager $impersonation): RedirectResponse
    {
        $this->authorizeManagement($request);
        $this->authorizeUserScope($request, $user);
        abort_unless($this->canImpersonate($request, $user), 403);
        abort_if($impersonation->isImpersonating(), 422, 'Leave the current impersonation session before starting another one.');

        $actor = $request->user();
        $this->auditLogger->record($request, 'users.impersonation_started', $user, null, [
            'impersonator_id' => $actor->id,
            'impersonator_name' => $actor->name,
        ]);

        $request->session()->put(self::ORIGINAL_BRANCH_SESSION_KEY, $request->session()->get(BranchAccessService::SESSION_KEY));
        $request->session()->forget(BranchAccessService::SESSION_KEY);
        abort_unless($actor->impersonate($user), 500, 'Unable to start impersonation.');

        return to_route('branch-selection.index')->with('success', "You are now working as {$user->name}.");
    }

    public function leaveImpersonation(Request $request, ImpersonateManager $impersonation): RedirectResponse
    {
        abort_unless($impersonation->isImpersonating(), 404);

        /** @var User $impersonated */
        $impersonated = $request->user();
        /** @var User $impersonator */
        $impersonator = $impersonation->getImpersonator();
        $originalBranchId = $request->session()->pull(self::ORIGINAL_BRANCH_SESSION_KEY);
        abort_unless($impersonation->leave(), 500, 'Unable to leave impersonation.');

        if ($originalBranchId) {
            $request->session()->put(BranchAccessService::SESSION_KEY, $originalBranchId);
        }

        $request->setUserResolver(fn () => $impersonator);
        setPermissionsTeamId($impersonator->organization_id);
        $this->auditLogger->record($request, 'users.impersonation_ended', $impersonated, null, [
            'impersonator_id' => $impersonator->id,
            'impersonator_name' => $impersonator->name,
        ]);

        return to_route('administration.users.index')->with('success', 'Impersonation ended. You are back in your administrator account.');
    }

    public function export(Request $request): BinaryFileResponse
    {
        $this->authorizeManagement($request);
        $users = $this->filteredUsers($request)->get();
        $organizationName = $request->user()->organization?->trading_name
            ?: $request->user()->organization?->legal_name
            ?: 'Alpha International Land Developers';
        $path = $this->workbooks->create($organizationName, $users);

        return response()->download($path, 'alpha-land-users-'.now()->format('Y-m-d').'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function filteredUsers(Request $request): Builder
    {
        $query = $this->scopedUsers($request)
            ->with(['homeBranch:id,name,code', 'roles:id,name,code', 'branchAccess.branch:id,name,code']);
        $search = trim((string) $request->string('search'));
        $status = $request->string('status')->toString();
        $branchId = $request->integer('branch');

        if ($search !== '') {
            $query->where(fn (Builder $builder) => $builder
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhereHas('roles', fn (Builder $roles) => $roles->where('name', 'like', "%{$search}%")));
        }
        if (in_array($status, ['active', 'suspended', 'inactive'], true)) {
            $query->where('status', $status);
        }
        if ($branchId) {
            $query->where(fn (Builder $builder) => $builder
                ->where('home_branch_id', $branchId)
                ->orWhereHas('branchAccess', fn (Builder $access) => $access->where('branch_id', $branchId)->where('active', true)));
        }

        return $query->orderBy('name');
    }

    private function scopedUsers(Request $request): Builder
    {
        $query = User::query()->where('organization_id', $request->user()->organization_id);
        $visibleBranchIds = $this->branchAccess->branchIds($request->user());
        if ($visibleBranchIds !== null) {
            $query->where(fn (Builder $builder) => $builder
                ->whereIn('home_branch_id', $visibleBranchIds)
                ->orWhereHas('branchAccess', fn (Builder $access) => $access
                    ->whereIn('branch_id', $visibleBranchIds)
                    ->where('active', true)));
        }

        return $query;
    }

    private function validateUser(Request $request, ?User $user = null): array
    {
        $organizationId = (int) $request->user()->organization_id;
        $branchRule = Rule::exists('branches', 'id')->where('organization_id', $organizationId);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'home_branch_id' => ['required', $branchRule],
            'role_ids' => ['required', 'array', 'min:1'],
            'role_ids.*' => [Rule::exists('roles', 'id')->where('organization_id', $organizationId)],
            'branch_ids' => ['required', 'array', 'min:1'],
            'branch_ids.*' => [$branchRule],
            'mfa_state' => ['required', Rule::in(['disabled', 'required', 'enabled'])],
            'status' => [$user ? 'required' : 'nullable', Rule::in(['active', 'suspended', 'inactive'])],
        ]);

        if (! in_array((int) $validated['home_branch_id'], array_map('intval', $validated['branch_ids']), true)) {
            throw ValidationException::withMessages([
                'home_branch_id' => 'The home branch must also be included in branch access.',
            ]);
        }

        return $validated;
    }

    private function syncAccess(User $user, array $validated, int $organizationId): void
    {
        $roles = Role::query()->where('organization_id', $organizationId)->whereIn('id', $validated['role_ids'])->get();
        $user->syncRoles($roles);

        $branchIds = collect($validated['branch_ids'])->map(fn ($id) => (int) $id)->unique()->values();
        UserBranchAccess::query()->where('user_id', $user->id)->whereNotIn('branch_id', $branchIds)->update(['active' => false]);
        foreach ($branchIds as $branchId) {
            UserBranchAccess::updateOrCreate(
                ['user_id' => $user->id, 'branch_id' => $branchId],
                ['access_level' => 'operational', 'active' => true],
            );
        }
    }

    private function userSummary(User $user, Request $request): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'mfa_state' => $user->mfa_state,
            'home_branch' => $user->homeBranch?->only(['id', 'name', 'code']),
            'roles' => $user->roles->map->only(['id', 'name', 'code'])->values(),
            'branch_count' => $user->branchAccess->where('active', true)->count(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'can_impersonate' => $this->canImpersonate($request, $user),
        ];
    }

    private function userDetail(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'mfa_state' => $user->mfa_state,
            'home_branch_id' => $user->home_branch_id ? (string) $user->home_branch_id : '',
            'home_branch' => $user->homeBranch?->only(['id', 'name', 'code']),
            'role_ids' => $user->roles->pluck('id')->map(fn ($id) => (string) $id)->values(),
            'roles' => $user->roles->map->only(['id', 'name', 'code'])->values(),
            'branch_ids' => $user->branchAccess->where('active', true)->pluck('branch_id')->map(fn ($id) => (string) $id)->values(),
            'branches' => $user->branchAccess->where('active', true)->map(fn (UserBranchAccess $access) => [
                'id' => $access->branch_id,
                'name' => $access->branch?->name,
                'code' => $access->branch?->code,
                'access_level' => $access->access_level,
            ])->values(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }

    private function userAuditData(User $user): array
    {
        $user->loadMissing(['roles:id,name', 'branchAccess']);

        return [
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'mfa_state' => $user->mfa_state,
            'home_branch_id' => $user->home_branch_id,
            'role_ids' => $user->roles->pluck('id')->all(),
            'branch_ids' => $user->branchAccess->where('active', true)->pluck('branch_id')->all(),
        ];
    }

    private function branchOptions(int $organizationId)
    {
        return Branch::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn (Branch $branch) => ['value' => (string) $branch->id, 'label' => $branch->name, 'code' => $branch->code]);
    }

    private function roleOptions(int $organizationId)
    {
        return Role::query()
            ->where('organization_id', $organizationId)
            ->where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'description'])
            ->map(fn (Role $role) => [
                'value' => (string) $role->id,
                'label' => $role->name,
                'code' => $role->code,
                'description' => $role->description,
            ]);
    }

    private function authorizeManagement(Request $request): void
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);
    }

    private function authorizeUserScope(Request $request, User $user): void
    {
        abort_unless((int) $user->organization_id === (int) $request->user()->organization_id, 404);
        $visibleBranchIds = $this->branchAccess->branchIds($request->user());
        if ($visibleBranchIds !== null) {
            $visible = $visibleBranchIds->contains((int) $user->home_branch_id)
                || $user->branchAccess()->where('active', true)->whereIn('branch_id', $visibleBranchIds)->exists();
            abort_unless($visible, 404);
        }
    }

    private function canImpersonate(Request $request, User $user): bool
    {
        return $request->user()->can('phase-one.manage')
            && ! $request->user()->is($user)
            && $user->canBeImpersonated();
    }
}
