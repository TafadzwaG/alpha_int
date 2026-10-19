<?php

namespace App\Http\Controllers;

use App\Models\CallCentreCampaign;
use App\Models\Client;
use App\Models\ClientInteraction;
use App\Models\FollowUpTask;
use App\Models\Payment;
use App\Models\PromiseToPay;
use App\Services\CallCentreService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CallCentreController extends Controller
{
    public function __construct(private readonly CallCentreService $callCentre) {}

    public function index(Request $request): Response
    {
        $branch = $this->callCentre->selectedBranch($request);
        $search = trim((string) $request->query('search', ''));
        $today = today();

        $interactions = ClientInteraction::query()->where('branch_id', $branch->id);
        $tasks = FollowUpTask::query()->where('branch_id', $branch->id);
        $visibleTasks = (clone $tasks)->when(
            ! $request->user()->can('call-centre.tasks.assign'),
            fn (Builder $query) => $query->where('assigned_to', $request->user()->id),
        );
        $todayInteractions = (clone $interactions)->whereDate('occurred_at', $today);
        $todayCount = (clone $todayInteractions)->count();
        $contactedToday = (clone $todayInteractions)->whereNotIn('outcome', ['no_answer', 'wrong_number'])->count();

        $daily = collect(range(6, 0))->map(function (int $offset) use ($interactions) {
            $date = today()->subDays($offset);

            return [
                'date' => $date->toDateString(),
                'label' => $date->format('D'),
                'calls' => (clone $interactions)->whereDate('occurred_at', $date)->count(),
                'contacts' => (clone $interactions)->whereDate('occurred_at', $date)->whereNotIn('outcome', ['no_answer', 'wrong_number'])->count(),
            ];
        });

        $outcomeCounts = (clone $interactions)
            ->where('occurred_at', '>=', now()->subDays(30))
            ->selectRaw('outcome, COUNT(*) as aggregate')
            ->groupBy('outcome')
            ->orderByDesc('aggregate')
            ->get()
            ->map(fn ($row) => ['outcome' => $row->outcome ?: 'not_recorded', 'count' => (int) $row->aggregate]);

        return Inertia::render('call-centre/index', [
            'branch' => ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code],
            'branches' => $this->callCentre->branchOptions($request->user()),
            'filters' => ['search' => $search],
            'stats' => [
                'callsToday' => $todayCount,
                'contactedToday' => $contactedToday,
                'contactRate' => $todayCount ? round(($contactedToday / $todayCount) * 100, 1) : 0,
                'openTasks' => (clone $visibleTasks)->whereIn('status', ['open', 'in_progress'])->count(),
                'overdueTasks' => (clone $visibleTasks)->whereIn('status', ['open', 'in_progress'])->where('due_at', '<', now())->count(),
                'openPromises' => PromiseToPay::query()->where('branch_id', $branch->id)->where('status', 'open')->count(),
                'brokenPromises' => PromiseToPay::query()->where('branch_id', $branch->id)->where('status', 'broken')->count(),
                'collectionsToday' => (float) Payment::query()->where('branch_id', $branch->id)->where('status', 'approved')->whereDate('received_at', $today)->sum('amount'),
                'activeCampaigns' => CallCentreCampaign::query()->where('branch_id', $branch->id)->where('status', 'active')->count(),
            ],
            'daily' => $daily,
            'outcomes' => $outcomeCounts,
            'tasks' => $visibleTasks->with(['client:id,client_no,first_name,last_name,phone_normalized', 'assignee:id,name'])
                ->whereIn('status', ['open', 'in_progress'])
                ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END")
                ->orderBy('due_at')
                ->limit(8)
                ->get()
                ->map(fn (FollowUpTask $task) => $this->taskData($task)),
            'clients' => $search === '' ? [] : $this->callCentre->clientSearch($request->user(), $branch->id, $search),
            'notifications' => $request->user()->unreadNotifications()->latest()->limit(6)->get()->map(fn ($notification) => [
                'id' => $notification->id,
                'title' => $notification->data['title'] ?? 'Call centre alert',
                'message' => $notification->data['message'] ?? '',
                'url' => $notification->data['url'] ?? '/call-centre/queue',
                'createdAt' => $notification->created_at?->toIso8601String(),
            ]),
            'permissions' => [
                'createInteractions' => $request->user()->can('call-centre.interactions.create'),
                'manageTasks' => $request->user()->can('call-centre.tasks.manage'),
                'assignTasks' => $request->user()->can('call-centre.tasks.assign'),
                'manageCampaigns' => $request->user()->can('call-centre.campaigns.manage'),
                'viewReports' => $request->user()->can('call-centre.reports.view'),
                'supervise' => $request->user()->can('call-centre.supervise'),
            ],
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
        ]);
    }

    public function client(Request $request, Client $client): Response
    {
        $this->callCentre->authorizeClient($request->user(), $client);
        $client->load([
            'organization:id,base_currency_code',
            'owningBranch:id,name,code',
            'contacts:id,client_id,type,normalized_value,is_primary,verified_at',
            'files.branch:id,name,code',
            'files.allocations.stand.phase.development:id,name,code',
            'files.allocations.account:id,allocation_id,account_no,currency_code,status',
            'files.allocations.installments' => fn ($query) => $query->orderBy('due_date'),
        ]);
        $financial = $this->callCentre->financialSummary($client);
        $charges = $this->callCentre->chargesForClient($client);
        $accountIds = $client->files->flatMap->accounts->pluck('id');

        return Inertia::render('call-centre/clients/show', [
            'client' => [
                'id' => $client->id,
                'clientNo' => $client->client_no,
                'name' => trim("{$client->first_name} {$client->middle_names} {$client->last_name}"),
                'phone' => $client->phone_normalized,
                'branch' => $client->owningBranch?->name,
                'branchCode' => $client->owningBranch?->code,
                'status' => $client->status,
                'contacts' => $client->contacts->map(fn ($contact) => [
                    'type' => $contact->type, 'value' => $contact->normalized_value, 'primary' => $contact->is_primary,
                ])->values(),
                ...$financial,
            ],
            'allocations' => $client->files->flatMap->allocations->map(fn ($allocation) => [
                'id' => $allocation->id,
                'standId' => $allocation->stand_id,
                'standNo' => $allocation->stand?->stand_no,
                'development' => $allocation->stand?->phase?->development?->name,
                'status' => $allocation->status,
                'price' => (float) ($allocation->effective_price ?? 0),
                'currency' => $allocation->currency_code ?? $financial['currency'],
                'accountId' => $allocation->account?->id,
                'accountNo' => $allocation->account?->account_no,
            ])->values(),
            'charges' => $charges,
            'installments' => $client->files->flatMap->allocations->flatMap->installments->map(fn ($installment) => [
                'id' => $installment->id,
                'allocationId' => $installment->allocation_id,
                'sequence' => $installment->sequence_no,
                'dueDate' => $installment->due_date?->toDateString(),
                'amountDue' => (float) $installment->amount_due,
                'amountPaid' => (float) $installment->amount_paid,
                'currency' => $installment->currency_code,
                'status' => $installment->status,
                'overdue' => ! in_array($installment->status, ['paid', 'waived'], true) && $installment->due_date?->isPast(),
            ])->values(),
            'payments' => Payment::query()->whereIn('account_id', $accountIds)->where('status', 'approved')->with('method:id,name')->latest('received_at')->limit(12)->get()->map(fn (Payment $payment) => [
                'id' => $payment->id, 'amount' => (float) $payment->amount, 'currency' => $payment->currency_code,
                'method' => $payment->method?->name, 'receivedAt' => $payment->received_at?->toIso8601String(),
                'reference' => $payment->external_reference,
            ]),
            'interactions' => ClientInteraction::query()->where('client_id', $client->id)->with(['creator:id,name', 'campaign:id,name'])->latest('occurred_at')->limit(30)->get()->map(fn (ClientInteraction $interaction) => [
                'id' => $interaction->id, 'direction' => $interaction->direction, 'channel' => $interaction->channel,
                'type' => $interaction->interaction_type, 'occurredAt' => $interaction->occurred_at?->toIso8601String(),
                'durationSeconds' => $interaction->duration_seconds, 'summary' => $interaction->summary,
                'outcome' => $interaction->outcome, 'promiseDate' => $interaction->promise_date?->toDateString(),
                'agent' => $interaction->creator?->name, 'campaign' => $interaction->campaign?->name,
            ]),
            'tasks' => FollowUpTask::query()->where('client_id', $client->id)->with('assignee:id,name')->latest('due_at')->limit(20)->get()->map(fn (FollowUpTask $task) => $this->taskData($task)),
            'promises' => PromiseToPay::query()->where('client_id', $client->id)->with('creator:id,name')->latest('due_date')->get()->map(fn (PromiseToPay $promise) => [
                'id' => $promise->id, 'amount' => (float) $promise->promised_amount, 'currency' => $promise->currency_code,
                'dueDate' => $promise->due_date?->toDateString(), 'status' => $promise->status,
                'fulfilledAt' => $promise->fulfilled_at?->toIso8601String(), 'notes' => $promise->notes,
                'createdBy' => $promise->creator?->name,
            ]),
            'agents' => $this->callCentre->eligibleAgentOptions((int) $client->owning_branch_id),
            'campaigns' => CallCentreCampaign::query()->where('branch_id', $client->owning_branch_id)->whereIn('status', ['draft', 'active'])->orderBy('name')->get(['id', 'name'])->map(fn ($campaign) => ['value' => (string) $campaign->id, 'label' => $campaign->name]),
            'permissions' => [
                'createInteractions' => $request->user()->can('call-centre.interactions.create'),
                'manageTasks' => $request->user()->can('call-centre.tasks.manage'),
                'assignTasks' => $request->user()->can('call-centre.tasks.assign'),
            ],
        ]);
    }

    public function readNotification(Request $request, string $notification): RedirectResponse
    {
        $record = $request->user()->notifications()->whereKey($notification)->firstOrFail();
        $record->markAsRead();

        return back();
    }

    private function taskData(FollowUpTask $task): array
    {
        return [
            'id' => $task->id, 'clientId' => $task->client_id,
            'clientNo' => $task->client?->client_no,
            'client' => trim("{$task->client?->first_name} {$task->client?->last_name}"),
            'phone' => $task->client?->phone_normalized, 'taskType' => $task->task_type,
            'dueAt' => $task->due_at?->toIso8601String(), 'priority' => $task->priority,
            'status' => $task->status, 'assigneeId' => $task->assigned_to,
            'assignee' => $task->assignee?->name, 'notes' => $task->notes,
            'overdue' => in_array($task->status, ['open', 'in_progress'], true) && $task->due_at?->isPast(),
            'escalated' => (bool) $task->escalated_at,
        ];
    }
}
