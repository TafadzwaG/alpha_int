<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Branch;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleTestUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RoleAuditAccessTest extends TestCase
{
    use RefreshDatabase;

    private function event(User $user, string $type, ?int $branch = null): AuditEvent
    {
        return AuditEvent::create(['organization_id' => $user->organization_id, 'branch_id' => $branch ?? $user->home_branch_id,
            'actor_id' => $user->id, 'event_type' => strtolower($type).'.updated', 'subject_type' => $type, 'subject_id' => 1,
            'before_json' => [], 'after_json' => ['status' => 'active', 'password' => 'hidden', 'national_id_hash' => 'hidden'],
            'occurred_at' => now(), 'event_hash' => hash('sha256', (string) Str::uuid())]);
    }

    public function test_cashier_audit_is_limited_to_permitted_models_and_branches(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(RoleTestUsersSeeder::class);
        $user = User::where('email', 'cashier@roles.alpha.test')->firstOrFail();
        $payment = $this->event($user, 'Payment');
        $role = $this->event($user, 'Role');
        $foreign = $this->event($user, 'Payment', Branch::where('id', '!=', $user->home_branch_id)->firstOrFail()->id);
        $this->actingAs($user)->get('/administration/audit-events')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('events.data', fn ($rows) => collect($rows)->contains('id', $payment->id) && ! collect($rows)->contains('id', $role->id) && ! collect($rows)->contains('id', $foreign->id)));
        $this->get('/administration/audit-events/'.$payment->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->missing('event.after.password')->missing('event.after.national_id_hash')->where('event.after.status', 'active'));
        $this->get('/administration/audit-events/'.$role->id)->assertNotFound();
        $this->get('/administration/audit-events/'.$foreign->id)->assertNotFound();
    }

    public function test_call_centre_can_view_own_activity_without_general_administration_access(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(RoleTestUsersSeeder::class);
        $agent = User::where('email', 'call-centre@roles.alpha.test')->firstOrFail();
        $own = $this->event($agent, 'FollowUpTask');
        $other = $this->event(User::where('email', 'test@example.com')->firstOrFail(), 'FollowUpTask');
        $this->actingAs($agent)->get('/administration/audit-events/'.$own->id)->assertOk();
        $this->get('/administration/audit-events/'.$other->id)->assertNotFound();
        $this->get('/administration/audit-events')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('stats.total', 1)->where('stats.integrity.verified', 1)->has('options.actors', 1));
        $this->get('/administration')->assertForbidden();
    }
}
