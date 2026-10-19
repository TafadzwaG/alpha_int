<?php

namespace Database\Seeders;

use App\Models\CallCentreCampaign;
use App\Models\CallCentreCampaignMember;
use App\Models\Client;
use App\Models\ClientInteraction;
use App\Models\FollowUpTask;
use App\Models\Organization;
use App\Models\PromiseToPay;
use App\Models\User;
use Illuminate\Database\Seeder;

class CallCentreDemoSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::query()->where('code', 'ALPHA')->firstOrFail();
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        setPermissionsTeamId($organization->id);

        $clients = Client::query()
            ->where('organization_id', $organization->id)
            ->with(['owningBranch', 'files.accounts'])
            ->orderBy('id')
            ->get();

        $agentsByBranch = collect();
        User::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->with('branchAccess')
            ->get()
            ->each(function (User $user) use ($agentsByBranch) {
                $user->branchAccess->each(function ($access) use ($agentsByBranch, $user) {
                    if (! $agentsByBranch->has($access->branch_id)) {
                        $agentsByBranch->put($access->branch_id, $user);
                    }
                });
            });

        foreach ($clients as $index => $client) {
            $agent = $agentsByBranch->get($client->owning_branch_id) ?? $admin;
            $outcomes = ['client_contacted', 'promise_to_pay', 'no_answer', 'documentation_required', 'resolved'];

            foreach (range(0, 2) as $sequence) {
                $occurredAt = now()->subDays(($index + $sequence * 2) % 13)->setTime(9 + ($index % 6), 15 + ($sequence * 10));
                $outcome = $outcomes[($index + $sequence) % count($outcomes)];
                ClientInteraction::query()->updateOrCreate(
                    [
                        'client_id' => $client->id,
                        'occurred_at' => $occurredAt,
                        'summary' => "Demo contact {$sequence} for {$client->client_no}",
                    ],
                    [
                        'branch_id' => $client->owning_branch_id,
                        'direction' => $sequence === 2 ? 'inbound' : 'outbound',
                        'channel' => ['phone', 'whatsapp', 'email'][$sequence],
                        'interaction_type' => $sequence === 2 ? 'payment_query' : 'collection',
                        'duration_seconds' => 95 + ($index * 14) + ($sequence * 30),
                        'outcome' => $outcome,
                        'promise_date' => $outcome === 'promise_to_pay' ? today()->addDays(4 + $index) : null,
                        'created_by' => $agent->id,
                    ],
                );
            }

            $interaction = ClientInteraction::query()->where('client_id', $client->id)->latest('occurred_at')->first();
            $dueAt = match ($index % 4) {
                0 => now()->subDays(2),
                1 => now()->addHours(5),
                2 => now()->addDay(),
                default => now()->addDays(3),
            };
            FollowUpTask::query()->updateOrCreate(
                ['client_id' => $client->id, 'source_interaction_id' => $interaction?->id, 'task_type' => $index % 2 ? 'payment_reminder' : 'callback'],
                [
                    'branch_id' => $client->owning_branch_id,
                    'assigned_to' => $agent->id,
                    'due_at' => $dueAt,
                    'priority' => $dueAt->isPast() ? 'urgent' : ($index % 3 === 0 ? 'high' : 'normal'),
                    'status' => 'open',
                    'notes' => $index % 2 ? 'Confirm the next installment date and payment channel.' : 'Follow up on the latest client conversation.',
                ],
            );

            if ($index % 3 !== 2) {
                $dueDate = $index % 3 === 0 ? today()->subDays(3) : today()->addDays(5);
                PromiseToPay::query()->updateOrCreate(
                    ['client_id' => $client->id, 'interaction_id' => $interaction?->id],
                    [
                        'branch_id' => $client->owning_branch_id,
                        'account_id' => $client->files->flatMap->accounts->first()?->id,
                        'promised_amount' => 250 + ($index * 75),
                        'currency_code' => $organization->base_currency_code ?? 'USD',
                        'due_date' => $dueDate,
                        'status' => $dueDate->isPast() ? 'broken' : 'open',
                        'created_by' => $agent->id,
                        'breach_notified_at' => $dueDate->isPast() ? now()->subDay() : null,
                        'notes' => 'Demo installment commitment captured by the call centre.',
                    ],
                );
            }
        }

        foreach ($clients->groupBy('owning_branch_id') as $branchId => $branchClients) {
            $campaign = CallCentreCampaign::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'branch_id' => $branchId, 'name' => 'October arrears recovery'],
                [
                    'campaign_type' => 'overdue',
                    'aging_bucket' => 'all',
                    'description' => 'Prioritised outreach for overdue installment accounts.',
                    'status' => 'active',
                    'starts_on' => today()->startOfMonth(),
                    'ends_on' => today()->endOfMonth(),
                    'created_by' => $admin->id,
                ],
            );
            $agent = $agentsByBranch->get((int) $branchId) ?? $admin;
            foreach ($branchClients as $memberIndex => $client) {
                $lastInteraction = ClientInteraction::query()->where('client_id', $client->id)->latest('occurred_at')->first();
                CallCentreCampaignMember::query()->updateOrCreate(
                    ['campaign_id' => $campaign->id, 'client_id' => $client->id],
                    [
                        'assigned_to' => $agent->id,
                        'last_interaction_id' => $lastInteraction?->id,
                        'status' => $memberIndex === 0 ? 'contacted' : 'queued',
                        'priority' => $memberIndex === 0 ? 'high' : 'normal',
                    ],
                );
                if ($memberIndex === 0 && $lastInteraction) {
                    $lastInteraction->forceFill(['campaign_id' => $campaign->id])->save();
                }
            }
        }
    }
}
