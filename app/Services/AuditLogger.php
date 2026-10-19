<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogger
{
    public function record(Request $request, string $eventType, Model $subject, ?array $before = null, ?array $after = null): void
    {
        $organizationId = $subject->getAttribute('organization_id') ?? $request->user()?->organization_id;

        if (! $organizationId) {
            return;
        }

        $subjectId = is_numeric($subject->getKey())
            ? (int) $subject->getKey()
            : abs(crc32((string) $subject->getKey()));

        DB::transaction(function () use ($organizationId, $subject, $request, $eventType, $subjectId, $before, $after) {
            DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->value('id');
            // Eloquent persists the default model timestamp at second precision, so
            // the canonical hash input must use the same precision to be reproducible.
            $occurredAt = now()->startOfSecond();
            $previousHash = AuditEvent::query()
                ->where('organization_id', $organizationId)
                ->latest('id')
                ->value('event_hash');
            $payload = [
                'organization_id' => $organizationId,
                'branch_id' => $subject instanceof Branch
                    ? $subject->getKey()
                    : ($subject->getAttribute('branch_id') ?? $request->user()?->home_branch_id),
                'actor_id' => $request->user()?->id,
                'event_type' => $eventType,
                'subject_type' => class_basename($subject),
                'subject_id' => $subjectId,
                'before_json' => $before,
                'after_json' => $after,
                'ip_hash' => $request->ip() ? hash('sha256', $request->ip()) : null,
                'user_agent_hash' => $request->userAgent() ? hash('sha256', $request->userAgent()) : null,
                'occurred_at' => $occurredAt,
                'previous_hash' => $previousHash,
                'hash_version' => 1,
            ];
            $payload['event_hash'] = hash('sha256', json_encode([
                $previousHash,
                $eventType,
                class_basename($subject),
                $subjectId,
                $before,
                $after,
                $occurredAt->format('Y-m-d H:i:s.u'),
            ], JSON_THROW_ON_ERROR));

            AuditEvent::create($payload);
        });
    }
}
