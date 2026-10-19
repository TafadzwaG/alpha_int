<?php

namespace App\Http\Controllers;

use App\Models\Development;
use App\Models\DevelopmentPhase;
use App\Models\Stand;
use App\Models\StandLegalCase;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StandMapController extends Controller
{
    public function index(Request $request): Response
    {
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:80'],
            'development_id' => ['nullable', 'integer'],
            'phase_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['planned', 'available', 'reserved', 'allocated', 'withdrawn'])],
            'area_min' => ['nullable', 'numeric', 'min:0'],
            'area_max' => ['nullable', 'numeric', 'gte:area_min'],
            'hide_allocated' => ['nullable', 'boolean'],
        ]);
        $hideAllocated = $request->has('hide_allocated') ? $request->boolean('hide_allocated') : true;

        $baseQuery = Stand::query()
            ->whereHas('phase.development', fn (Builder $query) => $query->where('organization_id', $organizationId));

        $statusCounts = (clone $baseQuery)
            ->selectRaw('physical_status, COUNT(*) as aggregate')
            ->groupBy('physical_status')
            ->pluck('aggregate', 'physical_status');

        $stands = $baseQuery
            ->with([
                'phase.development:id,code,name,location',
                'standType:id,name',
                'allocations' => fn ($query) => $query
                    ->whereIn('status', ['approved', 'allocated'])
                    ->with('clientFile.client:id,client_no,first_name,last_name')
                    ->latest('allocated_at'),
                'activeLegalCases:id,stand_id,case_number,priority,status',
            ])
            ->when($validated['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $nested) => $nested
                ->where('stand_no', 'like', "%{$search}%")
                ->orWhere('survey_reference', 'like', "%{$search}%")))
            ->when($validated['development_id'] ?? null, fn (Builder $query, int $developmentId) => $query->whereHas('phase', fn (Builder $phase) => $phase->where('development_id', $developmentId)))
            ->when($validated['phase_id'] ?? null, fn (Builder $query, int $phaseId) => $query->where('phase_id', $phaseId))
            ->when($validated['status'] ?? null, fn (Builder $query, string $status) => $query->where('physical_status', $status))
            ->when(isset($validated['area_min']), fn (Builder $query) => $query->where('area_sqm', '>=', $validated['area_min']))
            ->when(isset($validated['area_max']), fn (Builder $query) => $query->where('area_sqm', '<=', $validated['area_max']))
            ->when($hideAllocated, fn (Builder $query) => $query
                ->where('physical_status', '!=', 'allocated')
                ->whereDoesntHave('allocations', fn (Builder $allocations) => $allocations->whereIn('status', ['approved', 'allocated'])))
            ->orderBy('phase_id')
            ->orderBy('stand_no')
            ->get()
            ->map(function (Stand $stand): array {
                $allocation = $stand->allocations->first();
                $client = $allocation?->clientFile?->client;

                return [
                    'id' => $stand->id,
                    'standNo' => $stand->stand_no,
                    'status' => $stand->physical_status,
                    'area' => $stand->area_sqm !== null ? (float) $stand->area_sqm : null,
                    'price' => (float) $stand->list_price,
                    'currency' => $stand->currency_code,
                    'surveyReference' => $stand->survey_reference,
                    'geometry' => $stand->geo_json,
                    'type' => $stand->standType?->name,
                    'phaseId' => $stand->phase_id,
                    'phase' => $stand->phase?->name,
                    'developmentId' => $stand->phase?->development_id,
                    'development' => $stand->phase?->development?->name,
                    'developmentCode' => $stand->phase?->development?->code,
                    'location' => $stand->phase?->development?->location,
                    'allocatedTo' => $client ? trim($client->first_name.' '.$client->last_name) : null,
                    'clientNumber' => $client?->client_no,
                    'legalFlagged' => $stand->activeLegalCases->isNotEmpty(),
                    'legalCasesCount' => $stand->activeLegalCases->count(),
                    'legalPriority' => $stand->activeLegalCases
                        ->sortBy(fn (StandLegalCase $case) => array_search($case->priority, ['critical', 'high', 'medium', 'low'], true))
                        ->first()?->priority,
                ];
            });

        $developments = Development::query()
            ->where('organization_id', $organizationId)
            ->whereHas('phases.stands')
            ->orderBy('name')
            ->get(['id', 'name']);
        $phases = DevelopmentPhase::query()
            ->whereHas('development', fn (Builder $query) => $query->where('organization_id', $organizationId))
            ->whereHas('stands')
            ->with('development:id,name')
            ->orderBy('development_id')
            ->orderBy('name')
            ->get()
            ->map(fn (DevelopmentPhase $phase) => [
                'value' => (string) $phase->id,
                'label' => $phase->development?->name.' · '.$phase->name,
                'developmentId' => (string) $phase->development_id,
            ]);

        return Inertia::render('property-operations/stand-map', [
            'stands' => $stands,
            'developments' => $developments->map(fn (Development $development) => ['value' => (string) $development->id, 'label' => $development->name]),
            'phases' => $phases,
            'filters' => [
                'search' => $validated['search'] ?? '',
                'development_id' => isset($validated['development_id']) ? (string) $validated['development_id'] : 'all',
                'phase_id' => isset($validated['phase_id']) ? (string) $validated['phase_id'] : 'all',
                'status' => $validated['status'] ?? 'all',
                'area_min' => isset($validated['area_min']) ? (string) $validated['area_min'] : '',
                'area_max' => isset($validated['area_max']) ? (string) $validated['area_max'] : '',
                'hide_allocated' => $hideAllocated,
            ],
            'summary' => [
                'total' => (int) $statusCounts->sum(),
                'visible' => $stands->count(),
                'available' => (int) ($statusCounts['available'] ?? 0),
                'allocated' => (int) ($statusCounts['allocated'] ?? 0),
                'reserved' => (int) ($statusCounts['reserved'] ?? 0),
                'withGeometry' => $stands->whereNotNull('geometry')->count(),
            ],
        ]);
    }
}
