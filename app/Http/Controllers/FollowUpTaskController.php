<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\FollowUpTask;
use App\Services\AuditLogger;
use App\Services\CallCentreService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FollowUpTaskController extends Controller
{
    public function __construct(
        private readonly CallCentreService $callCentre,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): Response
    {
        $branch = $this->callCentre->selectedBranch($request);
        $filters = [
            'search' => trim((string) $request->query('search', '')),
            'status' => (string) $request->query('status', 'open'),
            'priority' => (string) $request->query('priority', 'all'),
            'agent' => (string) $request->query('agent', 'all'),
            'aging' => (string) $request->query('aging', 'all'),
            'due_from' => (string) $request->query('due_from', ''),
            'due_to' => (string) $request->query('due_to', ''),
        ];
        $query = FollowUpTask::query()->where('branch_id', $branch->id)->with(['client:id,organization_id,client_no,first_name,last_name,phone_normalized', 'assignee:id,name']);

        if (! $request->user()->can('call-centre.tasks.assign')) {
            $query->where('assigned_to', $request->user()->id);
        }
        if ($filters['search'] !== '') {
            $query->whereHas('client', fn (Builder $client) => $client
                ->where('client_no', 'like', "%{$filters['search']}%")
                ->orWhere('first_name', 'like', "%{$filters['search']}%")
                ->orWhere('last_name', 'like', "%{$filters['search']}%")
                ->orWhere('phone_normalized', 'like', "%{$filters['search']}%"));
        }
        if ($filters['status'] !== 'all') {
            $filters['status'] === 'overdue'
                ? $query->whereIn('status', ['open', 'in_progress'])->where('due_at', '<', now())
                : $query->where('status', $filters['status']);
        }
        if ($filters['priority'] !== 'all') {
            $query->where('priority', $filters['priority']);
        }
        if ($filters['agent'] !== 'all' && $request->user()->can('call-centre.tasks.assign')) {
            $filters['agent'] === 'unassigned' ? $query->whereNull('assigned_to') : $query->where('assigned_to', $filters['agent']);
        }
        if ($filters['aging'] !== 'all') {
            $query->whereIn('client_id', $this->callCentre->debtorClientIds($branch->id, $filters['aging']));
        }
        $query->when($filters['due_from'] !== '', fn (Builder $builder) => $builder->whereDate('due_at', '>=', $filters['due_from']))
            ->when($filters['due_to'] !== '', fn (Builder $builder) => $builder->whereDate('due_at', '<=', $filters['due_to']));

        $tasks = $query
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END")
            ->orderBy('due_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (FollowUpTask $task) => $this->taskData($task));

        return Inertia::render('call-centre/queue', [
            'tasks' => $tasks,
            'filters' => $filters,
            'branch' => ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code],
            'branches' => $this->callCentre->branchOptions($request->user()),
            'agents' => $this->callCentre->eligibleAgentOptions($branch->id),
            'canAssign' => $request->user()->can('call-centre.tasks.assign'),
            'canManage' => $request->user()->can('call-centre.tasks.manage'),
        ]);
    }

    public function store(Request $request, Client $client): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.tasks.manage'), 403);
        $this->callCentre->authorizeClient($request->user(), $client);
        $validated = $request->validate($this->rules($request));
        $assigneeId = $this->callCentre->resolveAssignee(
            $request->user(),
            (int) $client->owning_branch_id,
            isset($validated['assigned_to']) ? (int) $validated['assigned_to'] : null,
        );
        $task = FollowUpTask::create([
            ...$validated,
            'client_id' => $client->id,
            'branch_id' => $client->owning_branch_id,
            'assigned_to' => $assigneeId,
            'status' => 'open',
        ]);
        $this->auditLogger->record($request, 'call-centre.task-created', $task, null, $task->getAttributes());

        return back()->with('success', 'Follow-up task created.');
    }

    public function update(Request $request, FollowUpTask $followUpTask): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.tasks.manage'), 403);
        $followUpTask->load('client');
        $this->callCentre->authorizeClient($request->user(), $followUpTask->client);
        abort_if(! $request->user()->can('call-centre.tasks.assign') && (int) $followUpTask->assigned_to !== (int) $request->user()->id, 403);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'in_progress', 'completed', 'cancelled'])],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->where('organization_id', $request->user()->organization_id)],
            'due_at' => ['nullable', 'date'],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        if (array_key_exists('assigned_to', $validated) && ! $request->user()->can('call-centre.tasks.assign')) {
            unset($validated['assigned_to']);
        }
        if (isset($validated['assigned_to'])) {
            $validated['assigned_to'] = $this->callCentre->resolveAssignee(
                $request->user(),
                (int) $followUpTask->branch_id,
                (int) $validated['assigned_to'],
            );
        }
        $before = $followUpTask->getAttributes();
        $followUpTask->fill(array_filter($validated, fn ($value) => $value !== null));
        if ($followUpTask->status === 'completed') {
            $followUpTask->completed_at = now();
            $followUpTask->completed_by = $request->user()->id;
        }
        $followUpTask->save();
        $this->auditLogger->record($request, 'call-centre.task-updated', $followUpTask, $before, $followUpTask->getAttributes());

        return back()->with('success', 'Task updated.');
    }

    public function bulkAssign(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.tasks.assign'), 403);
        $validated = $request->validate([
            'task_ids' => ['required', 'array', 'min:1'],
            'task_ids.*' => ['integer', 'exists:follow_up_tasks,id'],
            'assigned_to' => ['required', Rule::exists('users', 'id')->where('organization_id', $request->user()->organization_id)],
        ]);
        $tasks = FollowUpTask::query()->whereIn('id', $validated['task_ids'])->with('client')->get();
        foreach ($tasks as $task) {
            $this->callCentre->authorizeClient($request->user(), $task->client);
            $assigneeId = $this->callCentre->resolveAssignee($request->user(), (int) $task->branch_id, (int) $validated['assigned_to']);
            $before = $task->getAttributes();
            $task->forceFill(['assigned_to' => $assigneeId])->save();
            $this->auditLogger->record($request, 'call-centre.task-assigned', $task, $before, $task->getAttributes());
        }

        return back()->with('success', $tasks->count().' tasks assigned.');
    }

    private function rules(Request $request): array
    {
        return [
            'task_type' => ['required', Rule::in(['callback', 'payment_reminder', 'documentation', 'complaint', 'escalation', 'installment_reminder'])],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->where('organization_id', $request->user()->organization_id)],
            'due_at' => ['required', 'date'],
            'priority' => ['required', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    private function taskData(FollowUpTask $task): array
    {
        $financial = $this->callCentre->financialSummary($task->client);

        return [
            'id' => $task->id, 'clientId' => $task->client_id, 'clientNo' => $task->client?->client_no,
            'client' => trim("{$task->client?->first_name} {$task->client?->last_name}"), 'phone' => $task->client?->phone_normalized,
            'taskType' => $task->task_type, 'dueAt' => $task->due_at?->toIso8601String(), 'priority' => $task->priority,
            'status' => $task->status, 'assigneeId' => $task->assigned_to, 'assignee' => $task->assignee?->name,
            'notes' => $task->notes, 'overdue' => in_array($task->status, ['open', 'in_progress'], true) && $task->due_at?->isPast(),
            'escalated' => (bool) $task->escalated_at, ...$financial,
        ];
    }
}
