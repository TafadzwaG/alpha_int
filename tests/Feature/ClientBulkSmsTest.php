<?php

namespace Tests\Feature;

use App\Jobs\SendSmsRecipient;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Organization;
use App\Models\Role;
use App\Models\SmsCampaign;
use App\Models\SmsRecipient;
use App\Models\User;
use App\Models\UserBranchAccess;
use App\Services\BranchAccessService;
use App\Services\SmsSender;
use Database\Seeders\OperationalDemoSeeder;
use Database\Seeders\PhaseOneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClientBulkSmsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PhaseOneSeeder::class);
        $this->seed(OperationalDemoSeeder::class);
        Client::query()->whereNotNull('phone_normalized')->update([
            'sms_consent' => true,
            'sms_consent_at' => now(),
            'sms_opted_out_at' => null,
        ]);
    }

    public function test_bulk_sms_has_a_dedicated_page_with_selected_client_preview(): void
    {
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $clients = Client::query()->whereNotNull('phone_normalized')->limit(2)->get();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->get('/call-centre/bulk-sms?audience_type=selected&'.http_build_query(['client_ids' => $clients->pluck('id')->all()]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('call-centre/bulk-sms/index')
                ->where('audience.type', 'selected')
                ->where('audience.matching', 2)
                ->where('audience.eligible', 2)
                ->has('audience.clients', 2)
                ->has('campaigns'));
    }

    public function test_administrator_can_queue_an_sms_campaign_for_selected_clients(): void
    {
        Queue::fake();
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $clients = Client::query()->whereNotNull('phone_normalized')->limit(2)->get();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->post('/call-centre/bulk-sms', [
                'idempotency_key' => fake()->uuid(),
                'name' => 'October balances',
                'message' => 'Alpha Land: your latest account balance is ready for review.',
                'audience_type' => 'selected',
                'client_ids' => $clients->pluck('id')->all(),
                'filters' => [],
            ])->assertRedirect('/call-centre/bulk-sms')->assertSessionHas('success');

        $campaign = SmsCampaign::query()->firstOrFail();
        $this->assertSame('log', $campaign->provider);
        $this->assertSame(2, $campaign->recipient_count);
        $this->assertEqualsCanonicalizing($clients->pluck('id')->all(), $campaign->recipients()->pluck('client_id')->all());
        Queue::assertPushed(SendSmsRecipient::class, 2);
        $this->assertTrue(AuditEvent::query()->where('event_type', 'clients.bulk-sms-queued')->exists());
    }

    public function test_filtered_campaign_uses_advanced_filters_and_excludes_clients_without_phone_numbers(): void
    {
        Queue::fake();
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        Client::query()->where('status', 'active')->firstOrFail()->update(['phone_normalized' => null]);
        $expected = Client::query()->where('status', 'active')->whereNotNull('phone_normalized')->where('phone_normalized', '!=', '')
            ->where('sms_consent', true)->whereNull('sms_opted_out_at')->count();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->post('/call-centre/bulk-sms', [
                'idempotency_key' => fake()->uuid(),
                'name' => 'Active client update',
                'message' => 'Alpha Land: please contact your branch for an account update.',
                'audience_type' => 'filtered',
                'client_ids' => [],
                'filters' => ['status' => 'active', 'phone' => 'with_phone'],
            ])->assertRedirect('/call-centre/bulk-sms')->assertSessionHas('success');

        $campaign = SmsCampaign::query()->firstOrFail();
        $this->assertSame($expected, $campaign->recipient_count);
        $this->assertSame($expected, $campaign->recipients()->count());
        $this->assertFalse($campaign->recipients()->whereHas('client', fn ($query) => $query->whereNull('phone_normalized'))->exists());
    }

    public function test_user_without_campaign_permission_cannot_queue_bulk_sms(): void
    {
        Queue::fake();
        $organization = Organization::query()->where('code', 'ALPHA')->firstOrFail();
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        setPermissionsTeamId($organization->id);
        $auditor = User::factory()->create([
            'organization_id' => $organization->id,
            'home_branch_id' => $admin->home_branch_id,
            'status' => 'active',
        ]);
        $auditor->assignRole(Role::query()->where('organization_id', $organization->id)->where('code', 'AUDITOR')->firstOrFail());
        UserBranchAccess::query()->create([
            'user_id' => $auditor->id,
            'branch_id' => $auditor->home_branch_id,
            'access_level' => 'read',
            'active' => true,
        ]);

        $this->actingAs($auditor)
            ->withSession([BranchAccessService::SESSION_KEY => $auditor->home_branch_id])
            ->post('/call-centre/bulk-sms', [
                'idempotency_key' => fake()->uuid(),
                'name' => 'Unauthorized campaign',
                'message' => 'This should not be queued.',
                'audience_type' => 'filtered',
                'filters' => [],
            ])->assertForbidden();

        $this->assertDatabaseCount('sms_campaigns', 0);
        Queue::assertNothingPushed();
    }

    public function test_disabled_twilio_configuration_simulates_delivery_and_completes_campaign(): void
    {
        config(['services.twilio.enabled' => false]);
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $client = Client::query()->whereNotNull('phone_normalized')->firstOrFail();
        $campaign = SmsCampaign::query()->create([
            'organization_id' => $admin->organization_id,
            'branch_id' => $client->owning_branch_id,
            'created_by' => $admin->id,
            'name' => 'Simulation check',
            'message' => 'A safe simulated message.',
            'audience_type' => 'selected',
            'provider' => 'log',
            'status' => 'queued',
            'recipient_count' => 1,
        ]);
        $recipient = SmsRecipient::query()->create([
            'sms_campaign_id' => $campaign->id,
            'client_id' => $client->id,
            'phone' => $client->phone_normalized,
            'status' => 'queued',
        ]);

        (new SendSmsRecipient($recipient->id))->handle(app(SmsSender::class));

        $this->assertSame('simulated', $recipient->fresh()->status);
        $this->assertSame('completed', $campaign->fresh()->status);
        $this->assertSame(1, $campaign->fresh()->simulated_count);
    }
}
