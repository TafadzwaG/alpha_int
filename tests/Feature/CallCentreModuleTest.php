<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Branch;
use App\Models\CallCentreCampaign;
use App\Models\Client;
use App\Models\FollowUpTask;
use App\Models\User;
use App\Notifications\CallCentreAlert;
use App\Services\BranchAccessService;
use App\Services\CallCentreAutomationService;
use Database\Seeders\CallCentreDemoSeeder;
use Database\Seeders\OperationalDemoSeeder;
use Database\Seeders\PhaseOneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CallCentreModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PhaseOneSeeder::class);
        $this->seed(OperationalDemoSeeder::class);
        $this->seed(CallCentreDemoSeeder::class);
    }

    public function test_administrator_can_use_all_call_centre_workspaces(): void
    {
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::query()->where('organization_id', $admin->organization_id)->where('code', 'HQ')->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $branch->id];

        $this->actingAs($admin)->withSession($session)->get('/call-centre?search=CLI-1001')
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('call-centre/index')
            ->where('branch.id', $branch->id)
            ->where('stats.callsToday', fn ($value) => $value >= 0)
            ->has('clients', 1)
            ->has('tasks'));

        $this->actingAs($admin)->withSession($session)->get('/call-centre/queue')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('call-centre/queue')->has('tasks.data'));

        $this->actingAs($admin)->withSession($session)->get('/call-centre/campaigns')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('call-centre/campaigns/index')->has('campaigns'));

        $this->actingAs($admin)->withSession($session)->get('/call-centre/reports')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('call-centre/reports/index')->has('summary')->has('agentPerformance'));
    }

    public function test_agent_can_record_interaction_follow_up_and_promise_with_an_audit_event(): void
    {
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $client = Client::query()->where('client_no', 'CLI-1001')->with('files.accounts')->firstOrFail();
        $account = $client->files->flatMap->accounts->firstOrFail();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $client->owning_branch_id])
            ->post("/call-centre/clients/{$client->id}/interactions", [
                'direction' => 'outbound',
                'channel' => 'phone',
                'interaction_type' => 'collection',
                'occurred_at' => now()->toDateTimeString(),
                'duration_seconds' => 180,
                'summary' => 'Client committed to settle the next installment.',
                'outcome' => 'promise_to_pay',
                'follow_up_at' => now()->addDays(3)->toDateTimeString(),
                'priority' => 'high',
                'promise_amount' => 500,
                'promise_date' => today()->addDays(3)->toDateString(),
                'promise_account_id' => $account->id,
                'promise_notes' => 'Will pay by bank transfer.',
            ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('client_interactions', ['client_id' => $client->id, 'outcome' => 'promise_to_pay']);
        $this->assertDatabaseHas('follow_up_tasks', ['client_id' => $client->id, 'task_type' => 'callback', 'priority' => 'high']);
        $this->assertDatabaseHas('promises_to_pay', ['client_id' => $client->id, 'account_id' => $account->id, 'status' => 'open']);
        $this->assertTrue(AuditEvent::query()->where('event_type', 'call-centre.interaction-recorded')->where('actor_id', $admin->id)->exists());
    }

    public function test_branch_manager_cannot_open_another_branch_client_workspace(): void
    {
        $manager = User::query()->where('email', 'tawanda.ncube@alphaland.test')->firstOrFail();
        $client = Client::query()->whereHas('owningBranch', fn ($query) => $query->where('code', 'HQ'))->firstOrFail();

        $this->actingAs($manager)
            ->withSession([BranchAccessService::SESSION_KEY => $manager->home_branch_id])
            ->get("/call-centre/clients/{$client->id}")
            ->assertNotFound();
    }

    public function test_supervisor_can_generate_and_pause_a_collection_campaign(): void
    {
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::query()->where('code', 'HQ')->firstOrFail();
        $campaign = CallCentreCampaign::query()->create([
            'organization_id' => $admin->organization_id,
            'branch_id' => $branch->id,
            'name' => 'Ninety day recovery',
            'campaign_type' => 'overdue',
            'aging_bucket' => '90_plus',
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->post("/call-centre/campaigns/{$campaign->id}/generate")
            ->assertRedirect()->assertSessionHas('success');

        $this->assertGreaterThan(0, $campaign->members()->count());
        $this->assertSame('active', $campaign->fresh()->status);

        $this->actingAs($admin)->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->patch("/call-centre/campaigns/{$campaign->id}/status", ['status' => 'paused'])
            ->assertRedirect();
        $this->assertSame('paused', $campaign->fresh()->status);
    }

    public function test_reports_export_to_pdf_and_excel(): void
    {
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::query()->where('code', 'HQ')->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $branch->id];

        $this->actingAs($admin)->withSession($session)->get('/call-centre/reports/export/pdf')
            ->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->actingAs($admin)->withSession($session)->get('/call-centre/reports/export/excel')
            ->assertOk()->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_automation_sends_reminders_and_escalates_overdue_work(): void
    {
        Notification::fake();
        $task = FollowUpTask::query()->where('status', 'open')->firstOrFail();
        $task->forceFill(['due_at' => now()->addHours(2), 'reminder_sent_at' => null])->save();
        $overdue = FollowUpTask::query()->whereKeyNot($task->id)->where('status', 'open')->firstOrFail();
        $overdue->forceFill(['due_at' => now()->subDays(2), 'escalated_at' => null])->save();

        $result = app(CallCentreAutomationService::class)->run();

        $this->assertGreaterThanOrEqual(1, $result['taskReminders']);
        $this->assertGreaterThanOrEqual(1, $result['escalations']);
        $this->assertNotNull($task->fresh()->reminder_sent_at);
        $this->assertSame('urgent', $overdue->fresh()->priority);
        Notification::assertSentTo($task->assignee, CallCentreAlert::class);
    }
}
