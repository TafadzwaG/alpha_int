<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Branch;
use App\Models\User;
use App\Services\AuditTrailService;
use App\Services\BranchAccessService;
use App\Services\RoleAuditAccess;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AuditEventController extends Controller
{
    public function __construct(
        private readonly AuditTrailService $auditTrail,
        private readonly BranchAccessService $branchAccess,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless(app(RoleAuditAccess::class)->canView($request->user()), 403);
        $organizationId = (int) $request->user()->organization_id;
        $availableBranchIds = $this->branchAccess->availableBranches($request->user())->pluck('id');
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'event_type' => ['nullable', 'string', 'max:100'],
            'subject_type' => ['nullable', 'string', 'max:80'],
            'actor' => ['nullable', 'integer'],
            'branch' => ['nullable', Rule::in($availableBranchIds->all())],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $base = $this->visibleQuery($request, $organizationId, $availableBranchIds->all());
        $query = clone $base;
        $search = trim((string) ($filters['search'] ?? ''));

        $query
            ->when($search !== '', function (Builder $builder) use ($search) {
                $builder->where(function (Builder $nested) use ($search) {
                    $nested->where('event_type', 'like', "%{$search}%")
                        ->orWhere('subject_type', 'like', "%{$search}%")
                        ->orWhere('subject_id', 'like', "%{$search}%")
                        ->orWhere('event_hash', 'like', "%{$search}%")
                        ->orWhereHas('actor', fn (Builder $actor) => $actor->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('branch', fn (Builder $branch) => $branch->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
                });
            })
            ->when(filled($filters['event_type'] ?? null), fn (Builder $builder) => $builder->where('event_type', $filters['event_type']))
            ->when(filled($filters['subject_type'] ?? null), fn (Builder $builder) => $builder->where('subject_type', $filters['subject_type']))
            ->when(filled($filters['actor'] ?? null), fn (Builder $builder) => $builder->where('actor_id', $filters['actor']))
            ->when(filled($filters['branch'] ?? null), fn (Builder $builder) => $builder->where('branch_id', $filters['branch']))
            ->when(filled($filters['date_from'] ?? null), fn (Builder $builder) => $builder->where('occurred_at', '>=', Carbon::parse($filters['date_from'])->startOfDay()))
            ->when(filled($filters['date_to'] ?? null), fn (Builder $builder) => $builder->where('occurred_at', '<=', Carbon::parse($filters['date_to'])->endOfDay()));

        $records = $query->with(['actor:id,name,email', 'branch:id,name,code'])
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (AuditEvent $event) => $this->serializeSummary($event));
        $integrity = ['valid' => true, 'issues' => 0, 'verified' => 0];
        (clone $base)->each(function ($event) use (&$integrity) {
            $integrity['verified']++;
            if (! $this->auditTrail->verify($event, $this->auditTrail->previousHash($event))['valid']) {
                $integrity['issues']++;
            }
        }, 500);
        $integrity['valid'] = $integrity['issues'] === 0;

        return Inertia::render('administration/audit-events/index', [
            'events' => $records,
            'filters' => [
                'search' => $search,
                'event_type' => (string) ($filters['event_type'] ?? 'all'),
                'subject_type' => (string) ($filters['subject_type'] ?? 'all'),
                'actor' => filled($filters['actor'] ?? null) ? (string) $filters['actor'] : 'all',
                'branch' => filled($filters['branch'] ?? null) ? (string) $filters['branch'] : 'all',
                'date_from' => (string) ($filters['date_from'] ?? ''),
                'date_to' => (string) ($filters['date_to'] ?? ''),
            ],
            'stats' => [
                'total' => (clone $base)->count(),
                'last_24_hours' => (clone $base)->where('occurred_at', '>=', now()->subDay())->count(),
                'actors' => (clone $base)->whereNotNull('actor_id')->distinct()->count('actor_id'),
                'event_types' => (clone $base)->distinct()->count('event_type'),
                'integrity' => $integrity,
            ],
            'options' => [
                'eventTypes' => (clone $base)->distinct()->orderBy('event_type')->pluck('event_type')->map(fn (string $value) => ['value' => $value, 'label' => str($value)->replace(['.', '_'], ' ')->headline()])->values(),
                'subjectTypes' => (clone $base)->distinct()->orderBy('subject_type')->pluck('subject_type')->map(fn (string $value) => ['value' => $value, 'label' => str($value)->headline()])->values(),
                'actors' => User::query()->whereIn('id', (clone $base)->whereNotNull('actor_id')->distinct()->pluck('actor_id'))->orderBy('name')->get()->map(fn (User $user) => ['value' => (string) $user->id, 'label' => $user->name])->values(),
                'branches' => Branch::query()->whereIn('id', $availableBranchIds)->orderBy('name')->get()->map(fn (Branch $branch) => ['value' => (string) $branch->id, 'label' => "{$branch->name} ({$branch->code})"])->values(),
            ],
        ]);
    }

    public function show(Request $request, string $auditEvent): Response
    {
        abort_unless(app(RoleAuditAccess::class)->canView($request->user()), 403);
        $organizationId = (int) $request->user()->organization_id;
        $branchIds = $this->branchAccess->availableBranches($request->user())->pluck('id')->all();
        $query = $this->visibleQuery($request, $organizationId, $branchIds);
        $event = $query->with(['actor:id,name,email', 'branch:id,name,code'])->findOrFail($auditEvent);
        $expectedPreviousHash = $this->auditTrail->previousHash($event);

        $safeEvent = clone $event;
        $safeEvent->before_json = app(RoleAuditAccess::class)->payload($event->before_json);
        $safeEvent->after_json = app(RoleAuditAccess::class)->payload($event->after_json);

        return Inertia::render('administration/audit-events/show', [
            'event' => [
                'id' => $event->id,
                'event_type' => $event->event_type,
                'subject_type' => $event->subject_type,
                'subject_id' => $event->subject_id,
                'subject' => "{$event->subject_type} #{$event->subject_id}",
                'actor' => $event->actor ? ['id' => $event->actor->id, 'name' => $event->actor->name, 'email' => $event->actor->email] : null,
                'branch' => $event->branch ? ['id' => $event->branch->id, 'name' => $event->branch->name, 'code' => $event->branch->code] : null,
                'occurred_at' => $event->occurred_at->toIso8601String(),
                'created_at' => $event->created_at?->toIso8601String(),
                'before' => $safeEvent->before_json,
                'after' => $safeEvent->after_json,
                'changes' => $this->auditTrail->changes($safeEvent),
                'ip_hash' => $event->ip_hash,
                'user_agent_hash' => $event->user_agent_hash,
                'previous_hash' => $event->previous_hash,
                'event_hash' => $event->event_hash,
                'integrity' => $this->auditTrail->verify($event, $expectedPreviousHash),
            ],
            'navigation' => [
                'previous' => (clone $query)->where('id', '<', $event->id)->latest('id')->value('id'),
                'next' => (clone $query)->where('id', '>', $event->id)->oldest('id')->value('id'),
            ],
        ]);
    }

    private function visibleQuery(Request $request, int $organizationId, array $branchIds): Builder
    {
        return app(RoleAuditAccess::class)->query($request->user());
    }

    private function serializeSummary(AuditEvent $event): array
    {
        $verification = $this->auditTrail->verify($event, $this->auditTrail->previousHash($event));

        return [
            'id' => $event->id,
            'occurred_at' => $event->occurred_at->toIso8601String(),
            'actor' => $event->actor?->name ?? 'System',
            'actor_email' => $event->actor?->email,
            'branch' => $event->branch?->name ?? 'Organization-wide',
            'event_type' => $event->event_type,
            'subject_type' => $event->subject_type,
            'subject' => "{$event->subject_type} #{$event->subject_id}",
            'event_hash' => $event->event_hash,
            'integrity_status' => $verification['valid'] ? 'verified' : 'issue',
            'change_count' => count($this->auditTrail->changes($event)),
        ];
    }
}
