<?php

namespace App\Http\Controllers;

use App\Models\CallCentreCampaign;
use App\Models\CallCentreCampaignMember;
use App\Models\Client;
use App\Models\ClientAccount;
use App\Models\ClientInteraction;
use App\Models\FollowUpTask;
use App\Models\PromiseToPay;
use App\Services\AuditLogger;
use App\Services\CallCentreService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClientInteractionController extends Controller
{
    public function __construct(
        private readonly CallCentreService $callCentre,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function store(Request $request, Client $client): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.interactions.create'), 403);
        $this->callCentre->authorizeClient($request->user(), $client);
        $validated = $request->validate([
            'campaign_id' => ['nullable', Rule::exists('call_centre_campaigns', 'id')->where('branch_id', $client->owning_branch_id)],
            'direction' => ['required', Rule::in(['inbound', 'outbound'])],
            'channel' => ['required', Rule::in(['phone', 'email', 'sms', 'whatsapp', 'walk_in'])],
            'interaction_type' => ['required', Rule::in(['collection', 'payment_query', 'documentation', 'complaint', 'general_enquiry', 'sales_follow_up'])],
            'occurred_at' => ['required', 'date'],
            'duration_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'summary' => ['required', 'string', 'max:4000'],
            'outcome' => ['required', Rule::in(['no_answer', 'wrong_number', 'client_contacted', 'promise_to_pay', 'payment_query', 'documentation_required', 'complaint', 'escalated', 'resolved'])],
            'follow_up_at' => ['nullable', 'date'],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->where('organization_id', $request->user()->organization_id)],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'promise_amount' => ['nullable', 'required_if:outcome,promise_to_pay', 'numeric', 'gt:0'],
            'promise_date' => ['nullable', 'required_if:outcome,promise_to_pay', 'date', 'after_or_equal:today'],
            'promise_account_id' => ['nullable', Rule::exists('client_accounts', 'id')],
            'promise_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $assigneeId = ! empty($validated['follow_up_at'])
            ? $this->callCentre->resolveAssignee(
                $request->user(),
                (int) $client->owning_branch_id,
                ! empty($validated['assigned_to']) ? (int) $validated['assigned_to'] : null,
            )
            : null;
        if (! empty($validated['promise_account_id'])) {
            abort_unless(ClientAccount::query()->whereKey($validated['promise_account_id'])->whereHas('clientFile', fn ($query) => $query->where('client_id', $client->id))->exists(), 422, 'The selected account does not belong to this client.');
        }

        $interaction = DB::transaction(function () use ($request, $client, $validated, $assigneeId) {
            $interaction = ClientInteraction::create([
                'client_id' => $client->id,
                'branch_id' => $client->owning_branch_id,
                'campaign_id' => $validated['campaign_id'] ?? null,
                'direction' => $validated['direction'],
                'channel' => $validated['channel'],
                'interaction_type' => $validated['interaction_type'],
                'occurred_at' => $validated['occurred_at'],
                'duration_seconds' => $validated['duration_seconds'] ?? null,
                'summary' => $validated['summary'],
                'outcome' => $validated['outcome'],
                'promise_date' => $validated['promise_date'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            if (! empty($validated['follow_up_at'])) {
                FollowUpTask::create([
                    'client_id' => $client->id,
                    'branch_id' => $client->owning_branch_id,
                    'source_interaction_id' => $interaction->id,
                    'task_type' => $validated['outcome'] === 'escalated' ? 'escalation' : 'callback',
                    'assigned_to' => $assigneeId,
                    'due_at' => $validated['follow_up_at'],
                    'priority' => $validated['priority'] ?? 'normal',
                    'status' => 'open',
                    'notes' => $validated['summary'],
                ]);
            }

            if ($validated['outcome'] === 'promise_to_pay') {
                PromiseToPay::create([
                    'client_id' => $client->id,
                    'branch_id' => $client->owning_branch_id,
                    'interaction_id' => $interaction->id,
                    'account_id' => $validated['promise_account_id'] ?? null,
                    'promised_amount' => $validated['promise_amount'],
                    'currency_code' => $request->user()->organization?->base_currency_code ?? 'USD',
                    'due_date' => $validated['promise_date'],
                    'status' => 'open',
                    'created_by' => $request->user()->id,
                    'notes' => $validated['promise_notes'] ?? null,
                ]);
            }

            if (! empty($validated['campaign_id'])) {
                CallCentreCampaignMember::query()
                    ->where('campaign_id', $validated['campaign_id'])
                    ->where('client_id', $client->id)
                    ->update(['last_interaction_id' => $interaction->id, 'status' => $validated['outcome'] === 'resolved' ? 'completed' : 'contacted']);
                CallCentreCampaign::query()->whereKey($validated['campaign_id'])->where('status', 'draft')->update(['status' => 'active']);
            }

            return $interaction;
        });

        $this->auditLogger->record($request, 'call-centre.interaction-recorded', $interaction, null, $interaction->getAttributes());

        return back()->with('success', 'Client interaction recorded successfully.');
    }
}
