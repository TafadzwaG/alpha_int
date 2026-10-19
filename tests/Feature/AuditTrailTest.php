<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\PhaseOneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuditTrailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PhaseOneSeeder::class);
    }

    public function test_administrator_can_filter_and_inspect_audit_events(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)->post('/administration/branches', [
            'code' => 'AUDIT',
            'name' => 'Audit Branch',
            'timezone' => 'Africa/Harare',
            'address' => 'Harare',
            'phone' => null,
            'email' => 'audit@example.com',
            'status' => 'active',
        ])->assertRedirect();

        $branch = Branch::where('code', 'AUDIT')->firstOrFail();
        $auditEvent = AuditEvent::where('event_type', 'branches.created')->where('subject_id', $branch->id)->firstOrFail();

        $this->actingAs($admin)
            ->get('/administration/audit-events?'.http_build_query([
                'search' => 'Audit Branch',
                'event_type' => 'branches.created',
                'subject_type' => 'Branch',
                'actor' => $admin->id,
                'branch' => $branch->id,
                'date_from' => now()->toDateString(),
                'date_to' => now()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/audit-events/index')
                ->where('filters.event_type', 'branches.created')
                ->where('filters.actor', (string) $admin->id)
                ->where('filters.branch', (string) $branch->id)
                ->where('stats.integrity.valid', true)
                ->has('events.data', 1)
                ->where('events.data.0.id', $auditEvent->id)
                ->where('events.data.0.integrity_status', 'verified'));

        $this->actingAs($admin)
            ->get("/administration/audit-events/{$auditEvent->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/audit-events/show')
                ->where('event.id', $auditEvent->id)
                ->where('event.actor.email', $admin->email)
                ->where('event.branch.code', 'AUDIT')
                ->where('event.integrity.valid', true)
                ->where('event.integrity.hash_valid', true)
                ->where('event.integrity.chain_valid', true)
                ->has('event.changes'));
    }

    public function test_tampered_audit_event_is_flagged(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $this->actingAs($admin)->post('/administration/branches', [
            'code' => 'TAMPER',
            'name' => 'Tamper Test Branch',
            'timezone' => 'Africa/Harare',
            'address' => 'Harare',
            'phone' => null,
            'email' => 'tamper@example.com',
            'status' => 'active',
        ])->assertRedirect();

        $event = AuditEvent::where('event_type', 'branches.created')->firstOrFail();
        $event->forceFill(['after_json' => ['tampered' => true]])->saveQuietly();

        $this->actingAs($admin)
            ->get("/administration/audit-events/{$event->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('event.integrity.valid', false)
                ->where('event.integrity.hash_valid', false));

        $this->actingAs($admin)
            ->get('/administration/audit-events')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.integrity.valid', false)
                ->where('stats.integrity.issues', fn ($issues) => $issues >= 1));
    }

    public function test_audit_event_details_are_organization_scoped(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $other = Organization::create([
            'code' => 'AUDIT-OTHER',
            'legal_name' => 'Other Audit Organization',
            'base_currency_code' => 'USD',
            'timezone' => 'Africa/Harare',
            'status' => 'active',
        ]);
        $foreignEvent = AuditEvent::create([
            'organization_id' => $other->id,
            'event_type' => 'test.created',
            'subject_type' => 'Test',
            'subject_id' => 1,
            'occurred_at' => now(),
            'event_hash' => str_repeat('a', 64),
        ]);

        $this->actingAs($admin)
            ->get("/administration/audit-events/{$foreignEvent->id}")
            ->assertNotFound();
    }
}
