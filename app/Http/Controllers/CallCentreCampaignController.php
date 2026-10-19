<?php

namespace App\Http\Controllers;

use App\Models\CallCentreCampaign;
use App\Models\CallCentreCampaignMember;
use App\Models\Client;
use App\Models\PromiseToPay;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\CallCentreService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CallCentreCampaignController extends Controller
{
    public function __construct(
        private readonly CallCentreService $callCentre,
        private readonly BranchAccessService $branchAccess,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): Response
    {
        $branch = $this->callCentre->selectedBranch($request);
        $campaigns = CallCentreCampaign::query()
            ->where('organization_id', $request->user()->organization_id)
            ->where('branch_id', $branch->id)
            ->withCount([
                'members',
                'members as completed_count' => fn (Builder $query) => $query->where('status', 'completed'),
                'members as contacted_count' => fn (Builder $query) => $query->whereIn('status', ['contacted', 'completed']),
            ])
            ->latest('id')
            ->get();
        $selectedId = (int) ($request->integer('campaign') ?: ($campaigns->first()?->id ?? 0));
        $selected = $campaigns->firstWhere('id', $selectedId);
        $members = $selected
            ? CallCentreCampaignMember::query()->where('campaign_id', $selected->id)
                ->with(['client:id,organization_id,client_no,first_name,last_name,phone_normalized', 'assignee:id,name', 'lastInteraction:id,outcome,occurred_at'])
                ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END")
                ->paginate(25)->withQueryString()->through(fn (CallCentreCampaignMember $member) => [
                    'id' => $member->id, 'clientId' => $member->client_id, 'clientNo' => $member->client?->client_no,
                    'client' => trim("{$member->client?->first_name} {$member->client?->last_name}"), 'phone' => $member->client?->phone_normalized,
                    'assignee' => $member->assignee?->name, 'status' => $member->status, 'priority' => $member->priority,
                    'lastOutcome' => $member->lastInteraction?->outcome, 'lastContactAt' => $member->lastInteraction?->occurred_at?->toIso8601String(),
                    ...$this->callCentre->financialSummary($member->client),
                ])
            : null;

        return Inertia::render('call-centre/campaigns/index', [
            'branch' => ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code],
            'branches' => $this->callCentre->branchOptions($request->user()),
            'campaigns' => $campaigns->map(fn (CallCentreCampaign $campaign) => [
                'id' => $campaign->id, 'name' => $campaign->name, 'type' => $campaign->campaign_type,
                'agingBucket' => $campaign->aging_bucket, 'status' => $campaign->status,
                'startsOn' => $campaign->starts_on?->toDateString(), 'endsOn' => $campaign->ends_on?->toDateString(),
                'members' => $campaign->members_count, 'contacted' => $campaign->contacted_count,
                'completed' => $campaign->completed_count,
            ]),
            'selectedCampaignId' => $selected?->id,
            'members' => $members,
            'agents' => $this->callCentre->eligibleAgentOptions($branch->id),
            'canManage' => $request->user()->can('call-centre.campaigns.manage'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.campaigns.manage'), 403);
        $validated = $request->validate([
            'branch_id' => ['required', Rule::exists('branches', 'id')->where('organization_id', $request->user()->organization_id)],
            'name' => ['required', 'string', 'max:255'],
            'campaign_type' => ['required', Rule::in(['overdue', 'due_soon', 'broken_promises', 'dormant_clients'])],
            'aging_bucket' => ['nullable', Rule::in(['all', 'current', '1_30', '31_60', '61_90', '90_plus'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
        ]);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $validated['branch_id']), 404);
        $campaign = CallCentreCampaign::create([
            ...$validated,
            'organization_id' => $request->user()->organization_id,
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);
        $this->auditLogger->record($request, 'call-centre.campaign-created', $campaign, null, $campaign->getAttributes());

        return redirect()->route('call-centre.campaigns.index', ['branch' => $campaign->branch_id, 'campaign' => $campaign->id])->with('success', 'Campaign created. Generate its call list when ready.');
    }

    public function generate(Request $request, CallCentreCampaign $campaign): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.campaigns.manage'), 403);
        $this->authorizeCampaign($request, $campaign);
        $clientIds = $this->campaignClientIds($campaign);
        $agents = collect($this->callCentre->eligibleAgentOptions($campaign->branch_id))->pluck('value')->map(fn ($id) => (int) $id)->values();

        foreach ($clientIds->values() as $index => $clientId) {
            CallCentreCampaignMember::updateOrCreate(
                ['campaign_id' => $campaign->id, 'client_id' => $clientId],
                [
                    'assigned_to' => $agents->isNotEmpty() ? $agents[$index % $agents->count()] : null,
                    'status' => 'queued',
                    'priority' => in_array($campaign->aging_bucket, ['61_90', '90_plus'], true) ? 'high' : 'normal',
                ],
            );
        }
        $before = $campaign->getAttributes();
        $campaign->forceFill(['status' => $clientIds->isEmpty() ? 'draft' : 'active'])->save();
        $this->auditLogger->record($request, 'call-centre.campaign-generated', $campaign, $before, [
            ...$campaign->getAttributes(), 'generated_members' => $clientIds->count(),
        ]);

        return back()->with('success', $clientIds->count().' clients added to the campaign.');
    }

    public function updateStatus(Request $request, CallCentreCampaign $campaign): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.campaigns.manage'), 403);
        $this->authorizeCampaign($request, $campaign);
        $validated = $request->validate(['status' => ['required', Rule::in(['draft', 'active', 'paused', 'completed', 'cancelled'])]]);
        $before = $campaign->getAttributes();
        $campaign->forceFill($validated)->save();
        $this->auditLogger->record($request, 'call-centre.campaign-status-updated', $campaign, $before, $campaign->getAttributes());

        return back()->with('success', 'Campaign status updated.');
    }

    private function authorizeCampaign(Request $request, CallCentreCampaign $campaign): void
    {
        abort_unless((int) $campaign->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $campaign->branch_id), 404);
    }

    private function campaignClientIds(CallCentreCampaign $campaign): Collection
    {
        return match ($campaign->campaign_type) {
            'overdue' => $this->callCentre->debtorClientIds($campaign->branch_id, $campaign->aging_bucket ?: 'all'),
            'broken_promises' => PromiseToPay::query()->where('branch_id', $campaign->branch_id)->where('status', 'broken')->pluck('client_id')->unique(),
            'due_soon' => Client::query()->where('owning_branch_id', $campaign->branch_id)->whereHas('files.accounts.charges', fn (Builder $query) => $query
                ->whereNotIn('status', ['paid', 'void'])->whereBetween('due_date', [today(), today()->addDays(7)]))->pluck('id'),
            'dormant_clients' => Client::query()->where('owning_branch_id', $campaign->branch_id)->whereDoesntHave('interactions', fn (Builder $query) => $query->where('occurred_at', '>=', now()->subDays(30)))->pluck('id'),
            default => collect(),
        };
    }
}
