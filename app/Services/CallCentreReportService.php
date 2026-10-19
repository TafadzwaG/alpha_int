<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\ClientInteraction;
use App\Models\FollowUpTask;
use App\Models\Payment;
use App\Models\PromiseToPay;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class CallCentreReportService
{
    public function build(User $user, Collection $branchIds, Carbon $from, Carbon $to): array
    {
        $interactions = ClientInteraction::query()->whereIn('branch_id', $branchIds)->whereBetween('occurred_at', [$from, $to]);
        $tasks = FollowUpTask::query()->whereIn('branch_id', $branchIds);
        $promises = PromiseToPay::query()->whereIn('branch_id', $branchIds)->whereBetween('created_at', [$from, $to]);
        $payments = Payment::query()->whereIn('branch_id', $branchIds)->where('status', 'approved')->whereBetween('received_at', [$from, $to]);
        $totalInteractions = (clone $interactions)->count();
        $contacts = (clone $interactions)->whereNotIn('outcome', ['no_answer', 'wrong_number'])->count();

        $daily = collect();
        $cursor = $from->copy()->startOfDay();
        while ($cursor->lte($to)) {
            $day = $cursor->copy();
            $daily->push([
                'date' => $day->toDateString(),
                'label' => $day->format('d M'),
                'calls' => (clone $interactions)->whereDate('occurred_at', $day)->count(),
                'contacts' => (clone $interactions)->whereDate('occurred_at', $day)->whereNotIn('outcome', ['no_answer', 'wrong_number'])->count(),
            ]);
            $cursor->addDay();
        }

        $agentPerformance = User::query()
            ->where('organization_id', $user->organization_id)
            ->whereHas('createdClientInteractions', fn (Builder $query) => $query->whereIn('branch_id', $branchIds)->whereBetween('occurred_at', [$from, $to]))
            ->withCount([
                'createdClientInteractions as interaction_count' => fn (Builder $query) => $query->whereIn('branch_id', $branchIds)->whereBetween('occurred_at', [$from, $to]),
                'createdClientInteractions as contact_count' => fn (Builder $query) => $query->whereIn('branch_id', $branchIds)->whereBetween('occurred_at', [$from, $to])->whereNotIn('outcome', ['no_answer', 'wrong_number']),
                'assignedCallCentreTasks as completed_tasks' => fn (Builder $query) => $query->whereIn('branch_id', $branchIds)->where('status', 'completed')->whereBetween('completed_at', [$from, $to]),
            ])
            ->orderByDesc('interaction_count')->get()->map(fn (User $agent) => [
                'agent' => $agent->name,
                'interactions' => $agent->interaction_count,
                'contacts' => $agent->contact_count,
                'contactRate' => $agent->interaction_count ? round(($agent->contact_count / $agent->interaction_count) * 100, 1) : 0,
                'completedTasks' => $agent->completed_tasks,
            ]);

        $branchPerformance = Branch::query()->whereIn('id', $branchIds)->orderBy('name')->get()->map(function (Branch $branch) use ($from, $to) {
            $calls = ClientInteraction::query()->where('branch_id', $branch->id)->whereBetween('occurred_at', [$from, $to])->count();
            $contacts = ClientInteraction::query()->where('branch_id', $branch->id)->whereBetween('occurred_at', [$from, $to])->whereNotIn('outcome', ['no_answer', 'wrong_number'])->count();

            return [
                'branch' => $branch->name,
                'calls' => $calls,
                'contacts' => $contacts,
                'openTasks' => FollowUpTask::query()->where('branch_id', $branch->id)->whereIn('status', ['open', 'in_progress'])->count(),
                'promises' => PromiseToPay::query()->where('branch_id', $branch->id)->whereBetween('created_at', [$from, $to])->count(),
                'collections' => (float) Payment::query()->where('branch_id', $branch->id)->where('status', 'approved')->whereBetween('received_at', [$from, $to])->sum('amount'),
            ];
        });

        return [
            'organization' => ['name' => $user->organization?->trading_name ?: $user->organization?->legal_name],
            'generatedAt' => now()->toIso8601String(),
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'currency' => $user->organization?->base_currency_code ?? 'USD',
            'summary' => [
                'interactions' => $totalInteractions,
                'contacts' => $contacts,
                'contactRate' => $totalInteractions ? round(($contacts / $totalInteractions) * 100, 1) : 0,
                'promises' => (clone $promises)->count(),
                'promiseValue' => (float) (clone $promises)->sum('promised_amount'),
                'brokenPromises' => (clone $promises)->where('status', 'broken')->count(),
                'completedTasks' => (clone $tasks)->where('status', 'completed')->whereBetween('completed_at', [$from, $to])->count(),
                'overdueTasks' => (clone $tasks)->whereIn('status', ['open', 'in_progress'])->where('due_at', '<', now())->count(),
                'collections' => (float) (clone $payments)->sum('amount'),
            ],
            'daily' => $daily->take(-31)->values(),
            'outcomes' => (clone $interactions)->selectRaw('outcome, COUNT(*) as total')->groupBy('outcome')->orderByDesc('total')->get()->map(fn ($row) => ['outcome' => $row->outcome ?: 'not_recorded', 'total' => (int) $row->total]),
            'agentPerformance' => $agentPerformance,
            'branchPerformance' => $branchPerformance,
        ];
    }
}
