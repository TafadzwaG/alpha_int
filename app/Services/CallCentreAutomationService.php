<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\FollowUpTask;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\PromiseToPay;
use App\Models\User;
use App\Notifications\CallCentreAlert;
use Illuminate\Database\Eloquent\Builder;

class CallCentreAutomationService
{
    public function run(): array
    {
        return [
            'installmentTasks' => $this->generateInstallmentTasks(),
            'taskReminders' => $this->sendTaskReminders(),
            'escalations' => $this->escalateOverdueTasks(),
            'fulfilledPromises' => $this->reconcilePromises(),
            'brokenPromises' => $this->markBrokenPromises(),
        ];
    }

    private function generateInstallmentTasks(): int
    {
        $created = 0;
        $installments = Installment::query()
            ->whereNotIn('status', ['paid', 'waived'])
            ->whereDate('due_date', '<=', today()->addDays(7))
            ->with(['allocation.clientFile.client', 'allocation.branch'])
            ->get();

        foreach ($installments as $installment) {
            $allocation = $installment->allocation;
            $client = $allocation?->clientFile?->client;
            if (! $allocation || ! $client || ! $allocation->branch_id) {
                continue;
            }
            $exists = FollowUpTask::query()->where('reference_type', Installment::class)->where('reference_id', $installment->id)->whereIn('status', ['open', 'in_progress'])->exists();
            if ($exists) {
                continue;
            }
            $assignee = $this->branchAgents($allocation->branch_id)->first();
            if (! $assignee) {
                continue;
            }
            $overdue = $installment->due_date->isPast();
            FollowUpTask::create([
                'client_id' => $client->id,
                'branch_id' => $allocation->branch_id,
                'task_type' => 'installment_reminder',
                'reference_type' => Installment::class,
                'reference_id' => $installment->id,
                'assigned_to' => $assignee->id,
                'due_at' => $overdue ? now() : $installment->due_date->copy()->subDays(2)->endOfDay(),
                'priority' => $overdue ? 'high' : 'normal',
                'status' => 'open',
                'notes' => "Contact {$client->first_name} {$client->last_name} about installment #{$installment->sequence_no} due {$installment->due_date->format('d M Y')}.",
            ]);
            $created++;
        }

        return $created;
    }

    private function sendTaskReminders(): int
    {
        $sent = 0;
        FollowUpTask::query()
            ->whereIn('status', ['open', 'in_progress'])
            ->whereNull('reminder_sent_at')
            ->whereBetween('due_at', [now(), now()->addDay()])
            ->with(['assignee', 'client'])
            ->get()
            ->each(function (FollowUpTask $task) use (&$sent) {
                if (! $task->assignee) {
                    return;
                }
                $task->assignee->notify(new CallCentreAlert(
                    'Call centre task due soon',
                    "Follow up with {$task->client?->first_name} {$task->client?->last_name} by {$task->due_at->format('d M Y H:i')}.",
                    '/call-centre/queue',
                ));
                $task->forceFill(['reminder_sent_at' => now()])->save();
                $sent++;
            });

        return $sent;
    }

    private function escalateOverdueTasks(): int
    {
        $escalated = 0;
        FollowUpTask::query()
            ->whereIn('status', ['open', 'in_progress'])
            ->whereNull('escalated_at')
            ->where('due_at', '<', now()->subDay())
            ->with('client')
            ->get()
            ->each(function (FollowUpTask $task) use (&$escalated) {
                $task->forceFill(['priority' => 'urgent', 'escalated_at' => now()])->save();
                $this->branchSupervisors((int) $task->branch_id)->each(fn (User $supervisor) => $supervisor->notify(new CallCentreAlert(
                    'Overdue call centre task escalated',
                    "The follow-up for {$task->client?->first_name} {$task->client?->last_name} is overdue and requires supervisor attention.",
                    '/call-centre/queue?status=overdue',
                )));
                $escalated++;
            });

        return $escalated;
    }

    private function reconcilePromises(): int
    {
        $fulfilled = 0;
        PromiseToPay::query()->where('status', 'open')->whereNotNull('account_id')->get()->each(function (PromiseToPay $promise) use (&$fulfilled) {
            $payments = Payment::query()
                ->where('account_id', $promise->account_id)
                ->where('status', 'approved')
                ->where('received_at', '>=', $promise->created_at)
                ->whereDate('received_at', '<=', $promise->due_date)
                ->get();
            if ((float) $payments->sum('amount') < (float) $promise->promised_amount) {
                return;
            }
            $promise->forceFill(['status' => 'fulfilled', 'fulfilled_at' => now(), 'payment_id' => $payments->sortByDesc('received_at')->first()?->id])->save();
            $fulfilled++;
        });

        return $fulfilled;
    }

    private function markBrokenPromises(): int
    {
        $broken = 0;
        PromiseToPay::query()->where('status', 'open')->whereDate('due_date', '<', today())->with(['client', 'creator'])->get()->each(function (PromiseToPay $promise) use (&$broken) {
            $promise->forceFill(['status' => 'broken', 'breach_notified_at' => now()])->save();
            $recipients = $this->branchSupervisors((int) $promise->branch_id);
            if ($promise->creator) {
                $recipients->push($promise->creator);
            }
            $recipients->unique('id')->each(fn (User $user) => $user->notify(new CallCentreAlert(
                'Promise to pay missed',
                "{$promise->client?->first_name} {$promise->client?->last_name} missed a {$promise->currency_code} ".number_format((float) $promise->promised_amount, 2).' promise.',
                "/call-centre/clients/{$promise->client_id}",
            )));
            $broken++;
        });

        return $broken;
    }

    private function branchAgents(int $branchId)
    {
        $organizationId = Branch::query()->whereKey($branchId)->value('organization_id');
        if ($organizationId) {
            setPermissionsTeamId($organizationId);
        }

        return User::query()->where('status', 'active')->whereHas('branchAccess', fn (Builder $query) => $query->where('branch_id', $branchId)->where('active', true))
            ->orderBy('id')->get()->filter(fn (User $user) => $user->can('call-centre.view'))->values();
    }

    private function branchSupervisors(int $branchId)
    {
        return $this->branchAgents($branchId)->filter(fn (User $user) => $user->can('call-centre.supervise'))->values();
    }
}
