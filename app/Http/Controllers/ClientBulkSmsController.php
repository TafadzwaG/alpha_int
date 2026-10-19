<?php

namespace App\Http\Controllers;

use App\Jobs\SendSmsRecipient;
use App\Models\SmsCampaign;
use App\Models\SmsRecipient;
use App\Services\AuditLogger;
use App\Services\PhaseOneResourceRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClientBulkSmsController extends Controller
{
    public function __construct(
        private readonly PhaseOneResourceRegistry $registry,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('call-centre.campaigns.manage'), 403);

        $validated = $request->validate([
            'audience_type' => ['nullable', Rule::in(['selected', 'filtered'])],
            'client_ids' => ['nullable', 'array', 'max:1000'],
            'client_ids.*' => ['integer'],
            'search' => ['nullable', 'string', 'max:200'],
            'branch' => ['nullable', 'string', 'max:20'],
            'status' => ['nullable', Rule::in(['all', 'prospect', 'active', 'inactive', 'blocked'])],
            'payment' => ['nullable', Rule::in(['all', 'overdue', 'upcoming', 'none'])],
            'follow_up' => ['nullable', Rule::in(['all', 'overdue', 'upcoming', 'none'])],
            'phone' => ['nullable', Rule::in(['all', 'with_phone', 'without_phone'])],
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'name_asc', 'name_desc'])],
        ]);

        $audienceType = $validated['audience_type'] ?? 'filtered';
        $selectedIds = collect($validated['client_ids'] ?? [])->map(fn ($id) => (int) $id)->unique()->values()->all();
        $filterKeys = ['search', 'branch', 'status', 'payment', 'follow_up', 'phone', 'created_from', 'created_to', 'sort'];
        $filters = collect($validated)
            ->only($filterKeys)
            ->filter(fn ($value) => filled($value) && $value !== 'all')
            ->all();

        $directoryRequest = clone $request;
        $directoryRequest->replace([
            ...$filters,
            'ids' => $audienceType === 'selected' ? $selectedIds : null,
        ]);
        $directory = $this->registry->page('clients', $directoryRequest, true);
        $records = $directory['records']->unique('id')->values();
        $eligible = $records->filter(fn (array $client) => $this->isSmsEligible($client));

        $campaignQuery = SmsCampaign::query()
            ->where('organization_id', $request->user()->organization_id);
        $recentCampaigns = (clone $campaignQuery)
            ->with(['branch:id,name,code', 'creator:id,name'])
            ->latest()
            ->limit(12)
            ->get()
            ->map(fn (SmsCampaign $campaign) => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'provider' => $campaign->provider,
                'audienceType' => $campaign->audience_type,
                'branch' => $campaign->branch?->name,
                'recipientCount' => $campaign->recipient_count,
                'sentCount' => $campaign->sent_count,
                'simulatedCount' => $campaign->simulated_count,
                'failedCount' => $campaign->failed_count,
                'createdAt' => $campaign->created_at?->toIso8601String(),
                'createdBy' => $campaign->creator?->name,
            ]);

        return Inertia::render('call-centre/bulk-sms/index', [
            'audience' => [
                'type' => $audienceType,
                'filters' => $filters,
                'selectedIds' => $selectedIds,
                'matching' => $records->count(),
                'eligible' => $eligible->count(),
                'excluded' => $records->count() - $eligible->count(),
                'clients' => $records->take(25)->map(fn (array $client) => [
                    'id' => (int) $client['id'],
                    'clientNo' => $client['client_no'],
                    'name' => $client['client_name'],
                    'branch' => $client['branch_name'],
                    'phone' => $client['phone_normalized'],
                    'eligible' => $this->isSmsEligible($client),
                    'exclusionReason' => $this->smsExclusionReason($client),
                ])->values(),
            ],
            'branches' => $directory['options']['branches'] ?? [],
            'provider' => $directory['smsProvider'],
            'summary' => [
                'campaigns' => (clone $campaignQuery)->count(),
                'inProgress' => (clone $campaignQuery)->whereIn('status', ['queued', 'processing'])->count(),
                'sent' => (int) (clone $campaignQuery)->sum('sent_count'),
                'simulated' => (int) (clone $campaignQuery)->sum('simulated_count'),
                'failed' => (int) (clone $campaignQuery)->sum('failed_count'),
            ],
            'campaigns' => $recentCampaigns,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.campaigns.manage'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'idempotency_key' => ['required', 'uuid'],
            'message' => ['required', 'string', 'max:800'],
            'audience_type' => ['required', Rule::in(['selected', 'filtered'])],
            'client_ids' => ['nullable', 'array', 'max:1000'],
            'client_ids.*' => ['integer'],
            'filters' => ['nullable', 'array'],
            'filters.search' => ['nullable', 'string', 'max:200'],
            'filters.branch' => ['nullable', 'string', 'max:20'],
            'filters.status' => ['nullable', Rule::in(['all', 'prospect', 'active', 'inactive', 'blocked'])],
            'filters.payment' => ['nullable', Rule::in(['all', 'overdue', 'upcoming', 'none'])],
            'filters.follow_up' => ['nullable', Rule::in(['all', 'overdue', 'upcoming', 'none'])],
            'filters.phone' => ['nullable', Rule::in(['all', 'with_phone', 'without_phone'])],
            'filters.created_from' => ['nullable', 'date_format:Y-m-d'],
            'filters.created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:filters.created_from'],
            'filters.sort' => ['nullable', Rule::in(['newest', 'oldest', 'name_asc', 'name_desc'])],
        ]);

        if ($validated['audience_type'] === 'selected' && empty($validated['client_ids'])) {
            throw ValidationException::withMessages(['client_ids' => 'Select at least one client before creating the SMS campaign.']);
        }
        if (SmsCampaign::query()->where('organization_id', $request->user()->organization_id)
            ->where('idempotency_key', $validated['idempotency_key'])->exists()) {
            return redirect()->route('call-centre.bulk-sms.index')->with('success', 'This SMS campaign was already queued.');
        }

        $filters = collect($validated['filters'] ?? [])->filter(fn ($value) => filled($value) && $value !== 'all')->all();
        $directoryRequest = clone $request;
        $directoryRequest->replace([
            ...$filters,
            'ids' => $validated['audience_type'] === 'selected' ? $validated['client_ids'] : null,
        ]);
        $records = $this->registry->page('clients', $directoryRequest, true)['records'];
        $recipients = $records
            ->filter(fn (array $client) => filled($client['phone_normalized'] ?? null)
                && ($client['sms_consent'] ?? false)
                && empty($client['sms_opted_out_at']))
            ->unique('id')
            ->values();

        if ($recipients->isEmpty()) {
            throw ValidationException::withMessages(['audience_type' => 'No clients in this audience have an SMS-ready phone number.']);
        }

        $campaign = DB::transaction(function () use ($request, $validated, $filters, $recipients) {
            $branchId = isset($filters['branch']) && ctype_digit((string) $filters['branch']) ? (int) $filters['branch'] : null;
            $campaign = SmsCampaign::create([
                'organization_id' => $request->user()->organization_id,
                'branch_id' => $branchId,
                'created_by' => $request->user()->id,
                'idempotency_key' => $validated['idempotency_key'],
                'name' => $validated['name'],
                'message' => $validated['message'],
                'audience_type' => $validated['audience_type'],
                'filters_json' => $filters,
                'provider' => config('services.twilio.enabled') ? 'twilio' : 'log',
                'status' => 'queued',
                'recipient_count' => $recipients->count(),
            ]);

            foreach ($recipients as $client) {
                $recipient = SmsRecipient::create([
                    'sms_campaign_id' => $campaign->id,
                    'client_id' => $client['id'],
                    'phone' => $client['phone_normalized'],
                    'status' => 'queued',
                ]);
                SendSmsRecipient::dispatch($recipient->id)->afterCommit();
            }

            $this->auditLogger->record($request, 'clients.bulk-sms-queued', $campaign, null, [
                'name' => $campaign->name,
                'audience_type' => $campaign->audience_type,
                'recipient_count' => $campaign->recipient_count,
                'provider' => $campaign->provider,
                'message_characters' => mb_strlen($campaign->message),
                'filters' => $filters,
            ]);

            return $campaign;
        });

        $delivery = $campaign->provider === 'twilio' ? 'Twilio delivery' : 'safe simulation';

        return redirect()->route('call-centre.bulk-sms.index')
            ->with('success', "SMS campaign queued for {$campaign->recipient_count} clients using {$delivery}.");
    }

    private function isSmsEligible(array $client): bool
    {
        return filled($client['phone_normalized'] ?? null)
            && (bool) ($client['sms_consent'] ?? false)
            && empty($client['sms_opted_out_at']);
    }

    private function smsExclusionReason(array $client): ?string
    {
        if (blank($client['phone_normalized'] ?? null)) {
            return 'No mobile number';
        }
        if (! ($client['sms_consent'] ?? false)) {
            return 'SMS consent not recorded';
        }
        if (! empty($client['sms_opted_out_at'])) {
            return 'Opted out';
        }

        return null;
    }
}
