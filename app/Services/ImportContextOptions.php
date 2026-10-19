<?php

namespace App\Services;

use App\Models\DevelopmentPhase;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\StandType;

class ImportContextOptions
{
    public function forOrganization(int $organizationId): array
    {
        $associations = StandAllocation::query()->where('status', '!=', 'cancelled')
            ->whereHas('stand.phase.development', fn ($query) => $query->where('organization_id', $organizationId))
            ->with('stand:id,phase_id,stand_type_id')->get(['stand_id', 'branch_id']);
        $stands = Stand::query()->whereHas('phase.development', fn ($query) => $query->where('organization_id', $organizationId))->get(['phase_id', 'stand_type_id']);

        return [
            'phases' => DevelopmentPhase::query()->whereHas('development', fn ($query) => $query->where('organization_id', $organizationId))
                ->with('development:id,name')->orderBy('name')->get()->map(fn ($phase) => [
                    'value' => (string) $phase->id, 'label' => $phase->development->name.' - '.$phase->name,
                    'branchIds' => $associations->filter(fn ($item) => $item->stand?->phase_id === $phase->id)->pluck('branch_id')->unique()->map(fn ($id) => (string) $id)->values()->all(),
                ])->values(),
            'standTypes' => StandType::query()->where('organization_id', $organizationId)->where('active', true)->orderBy('name')->get()->map(fn ($type) => [
                'value' => (string) $type->id, 'label' => $type->name,
                'branchIds' => $associations->filter(fn ($item) => $item->stand?->stand_type_id === $type->id)->pluck('branch_id')->unique()->map(fn ($id) => (string) $id)->values()->all(),
                'phaseIds' => $stands->where('stand_type_id', $type->id)->pluck('phase_id')->unique()->map(fn ($id) => (string) $id)->values()->all(),
            ])->values(),
        ];
    }

    public function eligible(array $option, string $branchId, ?string $phaseId = null): bool
    {
        return (empty($option['branchIds']) || in_array($branchId, $option['branchIds'], true))
            && ($phaseId === null || empty($option['phaseIds']) || in_array($phaseId, $option['phaseIds'], true));
    }
}
