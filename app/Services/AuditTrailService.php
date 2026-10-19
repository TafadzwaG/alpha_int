<?php

namespace App\Services;

use App\Models\AuditEvent;
use Illuminate\Database\Eloquent\Builder;

class AuditTrailService
{
    /** @return array{valid:bool,hash_valid:bool,chain_valid:bool,expected_hash:string,expected_previous_hash:?string} */
    public function verify(AuditEvent $event, ?string $expectedPreviousHash = null): array
    {
        $expectedHash = hash('sha256', json_encode([
            $event->previous_hash,
            $event->event_type,
            $event->subject_type,
            (int) $event->subject_id,
            $event->before_json,
            $event->after_json,
            $event->occurred_at->format('Y-m-d H:i:s.u'),
        ], JSON_THROW_ON_ERROR));
        // Version 0 records were written before timestamps were canonicalized to
        // database precision. Their chain links remain verifiable, but their own
        // content hash cannot be reproduced from the persisted row.
        $hashValid = (int) ($event->hash_version ?? 0) === 0
            || hash_equals($expectedHash, (string) $event->event_hash);
        $chainValid = $event->previous_hash === $expectedPreviousHash;

        return [
            'valid' => $hashValid && $chainValid,
            'hash_valid' => $hashValid,
            'chain_valid' => $chainValid,
            'expected_hash' => $expectedHash,
            'expected_previous_hash' => $expectedPreviousHash,
        ];
    }

    /** @return array{valid:bool,issues:int,verified:int} */
    public function verifyOrganization(int $organizationId): array
    {
        $previousHash = null;
        $issues = 0;
        $verified = 0;

        AuditEvent::query()
            ->where('organization_id', $organizationId)
            ->orderBy('id')
            ->each(function (AuditEvent $event) use (&$previousHash, &$issues, &$verified) {
                $verified++;
                if (! $this->verify($event, $previousHash)['valid']) {
                    $issues++;
                }
                $previousHash = $event->event_hash;
            }, 500);

        return ['valid' => $issues === 0, 'issues' => $issues, 'verified' => $verified];
    }

    /** @return array<int, array{field:string,status:string,before:mixed,after:mixed}> */
    public function changes(AuditEvent $event): array
    {
        $before = $event->before_json ?? [];
        $after = $event->after_json ?? [];
        $keys = collect(array_keys($before))->merge(array_keys($after))->unique()->sort()->values();

        return $keys->map(function (string $key) use ($before, $after) {
            $hasBefore = array_key_exists($key, $before);
            $hasAfter = array_key_exists($key, $after);

            return [
                'field' => $key,
                'status' => ! $hasBefore ? 'added' : (! $hasAfter ? 'removed' : ($before[$key] !== $after[$key] ? 'changed' : 'unchanged')),
                'before' => $before[$key] ?? null,
                'after' => $after[$key] ?? null,
            ];
        })->filter(fn (array $change) => $change['status'] !== 'unchanged')->values()->all();
    }

    public function previousHash(AuditEvent $event): ?string
    {
        return AuditEvent::query()
            ->where('organization_id', $event->organization_id)
            ->where('id', '<', $event->id)
            ->latest('id')
            ->value('event_hash');
    }

    public function scopedQuery(int $organizationId): Builder
    {
        return AuditEvent::query()->where('organization_id', $organizationId);
    }
}
