<?php

namespace Tests\Feature;

use App\Models\AccountCharge;
use App\Models\ApprovalRequest;
use App\Models\AuditEvent;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\ClientAccount;
use App\Models\ClientFile;
use App\Models\ClientInteraction;
use App\Models\Development;
use App\Models\DevelopmentPhase;
use App\Models\FollowUpTask;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Models\ReconciliationRun;
use App\Models\Role;
use App\Models\Stand;
use App\Models\StandType;
use App\Models\User;
use App\Services\BranchAccessService;
use Carbon\CarbonImmutable;
use Database\Seeders\OperationalDemoSeeder;
use Database\Seeders\PhaseOneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Tests\TestCase;

class PhaseOneAdministrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PhaseOneSeeder::class);
    }

    public function test_client_profile_includes_calls_and_exports(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::where('organization_id', $admin->organization_id)->firstOrFail();
        $this->actingAs($admin)->post('/administration/clients', ['owning_branch_id' => $branch->id, 'first_name' => 'Export', 'last_name' => 'Client', 'status' => 'active'])->assertSessionHasNoErrors();
        $client = Client::where('client_no', 'CLI-0001')->firstOrFail();
        $task = FollowUpTask::create(['client_id' => $client->id, 'branch_id' => $branch->id, 'task_type' => 'callback', 'assigned_to' => $admin->id, 'due_at' => now()->subDay(), 'priority' => 'normal', 'status' => 'open']);
        $this->actingAs($admin)->get('/administration/clients')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('records.data.0.next_follow_up.type', 'Callback')
            ->where('records.data.0.next_follow_up.overdue', true)
            ->where('records.data.0.last_payment', null)
            ->where('records.data.0.next_payment', null));
        $this->actingAs($admin)->get('/administration/clients?search=Export%20Client&follow_up=overdue&payment=none&sort=name_asc&per_page=10')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('records.total', 1)->where('clientStats.total', 1)->where('filters.follow_up', 'overdue')->where('records.per_page', 10));
        $this->actingAs($admin)->get('/administration/clients?follow_up=upcoming')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 0));
        $this->actingAs($admin)->get('/administration/clients?payment=overdue')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 0));
        $this->actingAs($admin)->get('/administration/clients?created_from=2026-10-20&created_to=2026-10-01')->assertSessionHasErrors('created_to');
        $this->actingAs($admin)->get('/administration/clients/export/pdf?follow_up=overdue')->assertOk()->assertHeader('content-type', 'application/pdf');
        $directory = $this->actingAs($admin)->get('/administration/clients/export/excel?ids[]='.$client->id)->assertOk();
        $directoryPath = $directory->baseResponse->getFile()->getPathname();
        $directoryZip = new \ZipArchive;
        $directoryZip->open($directoryPath);
        $this->assertStringContainsString('Export Client', $directoryZip->getFromName('xl/worksheets/sheet2.xml'));
        $this->assertStringNotContainsString('national_id', $directoryZip->getFromName('xl/worksheets/sheet2.xml'));
        $directoryZip->close();
        unlink($directoryPath);
        $task->update(['status' => 'completed']);
        $this->actingAs($admin)->get('/administration/clients')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.data.0.next_follow_up', null));

        ClientInteraction::create(['client_id' => $client->id, 'branch_id' => $branch->id, 'channel' => 'phone', 'direction' => 'outbound', 'interaction_type' => 'call', 'summary' => 'Discussed account', 'outcome' => 'answered', 'created_by' => $admin->id, 'occurred_at' => now()]);
        $this->actingAs($admin)->get('/administration/clients/'.$client->id)->assertOk()->assertInertia(fn (Assert $page) => $page->has('callHistory', 1)->where('callHistory.0.summary', 'Discussed account'));
        $pdf = $this->actingAs($admin)->get('/administration/clients/'.$client->id.'/export/pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
        $url = URL::signedRoute('administration.clients.verify', ['client' => $client->id, 'issued' => now()->toIso8601String(), 'reference' => $client->public_id]);
        $this->actingAs($admin)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page->where('verification.reference', $client->public_id));
        $this->actingAs($admin)->get($url.'&tampered=yes')->assertForbidden();

        $excel = $this->actingAs($admin)->get('/administration/clients/'.$client->id.'/export/excel')->assertOk();
        $path = $excel->baseResponse->getFile()->getPathname();
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($path));
        $this->assertStringContainsString('Call history', $zip->getFromName('xl/workbook.xml'));
        $this->assertStringContainsString('Discussed account', $zip->getFromName('xl/worksheets/sheet4.xml'));
        $zip->close();
        unlink($path);
    }

    public function test_client_numbers_are_generated_and_preserved(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::where('organization_id', $admin->organization_id)->firstOrFail();
        $payload = ['owning_branch_id' => $branch->id, 'first_name' => 'Auto', 'last_name' => 'Number', 'status' => 'active'];

        $this->actingAs($admin)->post('/administration/clients', $payload)->assertSessionHasNoErrors();
        $first = Client::where('client_no', 'CLI-0001')->firstOrFail();
        $this->actingAs($admin)->put('/administration/clients/'.$first->id, [...$payload, 'client_no' => 'MANUAL'])->assertSessionHasNoErrors();
        $this->assertSame('CLI-0001', $first->fresh()->client_no);
        $first->delete();

        $this->actingAs($admin)->post('/administration/clients', [...$payload, 'client_no' => 'MANUAL'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('clients', ['client_no' => 'CLI-0002', 'first_name' => 'Auto']);
        $this->assertDatabaseMissing('clients', ['client_no' => 'MANUAL']);
    }

    public function test_bulk_stands_are_atomic_and_reject_duplicates(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $development = Development::create(['organization_id' => $admin->organization_id, 'code' => 'BULK', 'name' => 'Bulk estate', 'location' => 'Harare', 'status' => 'active']);
        $phase = DevelopmentPhase::create(['development_id' => $development->id, 'code' => 'P1', 'name' => 'Phase 1', 'survey_status' => 'pending']);
        $type = StandType::where('organization_id', $admin->organization_id)->firstOrFail();
        $base = ['source_mode' => 'manual', 'phase_id' => $phase->id, 'stand_type_id' => $type->id, 'currency_code' => 'USD', 'physical_status' => 'planned', 'shared_list_price' => null];
        $invalid = $this->actingAs($admin)->post('/administration/stands/bulk/preview', [...$base, 'stands' => [
            ['stand_no' => 'B1', 'area_sqm' => 500, 'list_price' => 100],
            ['stand_no' => 'B2', 'area_sqm' => 600, 'list_price' => -1],
        ]])->assertSessionHasNoErrors();
        $this->assertFalse($invalid->getSession()->get('stand_bulk_preview_result')['valid']);
        $this->assertSame(1, $invalid->getSession()->get('stand_bulk_preview_result')['summary']['invalid']);
        $this->assertDatabaseMissing('stands', ['phase_id' => $phase->id, 'stand_no' => 'B1']);
        $rows = [['stand_no' => 'B1', 'area_sqm' => 500, 'list_price' => 100], ['stand_no' => 'B2', 'area_sqm' => 600, 'list_price' => 200]];
        $validated = $this->actingAs($admin)->post('/administration/stands/bulk/preview', [...$base, 'stands' => $rows])->assertSessionHasNoErrors();
        $result = $validated->getSession()->get('stand_bulk_preview_result');
        $this->assertTrue($result['valid']);
        $this->actingAs($admin)->post('/administration/stands/bulk', ['preview_token' => $result['preview_token']])->assertSessionHasNoErrors();
        $this->assertSame(2, Stand::where('phase_id', $phase->id)->count());
        $this->actingAs($admin)->get('/administration/stands?price_min=150&sort=price_desc')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 1)->where('records.data.0.stand_no', 'B2')->where('standStats.total', 1));
        $this->actingAs($admin)->get('/administration/stands/export/pdf?price_min=150')->assertOk()->assertHeader('content-type', 'application/pdf');
        $standId = Stand::where('phase_id', $phase->id)->where('stand_no', 'B1')->value('id');
        $excel = $this->actingAs($admin)->get('/administration/stands/export/excel?ids[]='.$standId)->assertOk();
        $path = $excel->baseResponse->getFile()->getPathname();
        $zip = new \ZipArchive;
        $zip->open($path);
        $sheet = $zip->getFromName('xl/worksheets/sheet2.xml');
        $this->assertStringContainsString('B1', $sheet);
        $this->assertStringNotContainsString('B2', strip_tags($sheet));
        $zip->close();
        unlink($path);

        $duplicate = $this->actingAs($admin)->post('/administration/stands/bulk/preview', [...$base, 'stands' => $rows])->assertSessionHasNoErrors();
        $this->assertFalse($duplicate->getSession()->get('stand_bulk_preview_result')['valid']);
        $this->assertSame(2, $duplicate->getSession()->get('stand_bulk_preview_result')['summary']['existing']);
        $this->assertSame(2, Stand::where('phase_id', $phase->id)->count());
    }

    public function test_bulk_stands_supports_two_hundred_rows_with_preview_confirmation(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $development = Development::create(['organization_id' => $admin->organization_id, 'code' => 'BULK200', 'name' => 'Bulk 200 estate', 'location' => 'Harare', 'status' => 'active']);
        $phase = DevelopmentPhase::create(['development_id' => $development->id, 'code' => 'P200', 'name' => 'Phase 200', 'survey_status' => 'pending']);
        $type = StandType::where('organization_id', $admin->organization_id)->firstOrFail();
        $rows = collect(range(1, 200))->map(fn (int $number) => [
            'stand_no' => 'L'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'area_sqm' => 400 + $number,
            'list_price' => '',
            'survey_reference' => "SUR-{$number}",
        ])->all();

        $validated = $this->actingAs($admin)->post('/administration/stands/bulk/preview', [
            'source_mode' => 'paste',
            'phase_id' => $phase->id,
            'stand_type_id' => $type->id,
            'currency_code' => 'USD',
            'physical_status' => 'planned',
            'shared_list_price' => 12_500,
            'stands' => $rows,
        ])->assertSessionHasNoErrors();
        $result = $validated->getSession()->get('stand_bulk_preview_result');
        $this->assertTrue($result['valid']);
        $this->assertSame(200, $result['summary']['valid']);

        $this->actingAs($admin)->post('/administration/stands/bulk', ['preview_token' => $result['preview_token']])->assertSessionHasNoErrors();
        $this->assertSame(200, Stand::where('phase_id', $phase->id)->count());
        $this->assertDatabaseHas('stands', ['phase_id' => $phase->id, 'stand_no' => 'L200', 'area_sqm' => 600, 'list_price' => 12_500]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'stands.bulk-created']);
        $this->actingAs($admin)->post('/administration/stands/bulk', ['preview_token' => $result['preview_token']])->assertSessionHasErrors('preview_token');
    }

    public function test_bulk_stands_excel_template_can_be_downloaded_and_uploaded_for_preview(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $development = Development::create(['organization_id' => $admin->organization_id, 'code' => 'BULKX', 'name' => 'Bulk Excel estate', 'location' => 'Harare', 'status' => 'active']);
        $phase = DevelopmentPhase::create(['development_id' => $development->id, 'code' => 'PX', 'name' => 'Excel phase', 'survey_status' => 'pending']);
        $type = StandType::where('organization_id', $admin->organization_id)->firstOrFail();

        $download = $this->actingAs($admin)->get('/administration/stands/bulk/template')->assertOk();
        $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $download->headers->get('content-type'));

        $path = tempnam(sys_get_temp_dir(), 'stand-upload-test-');
        $writer = new Writer;
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['Stand Number', 'Area (m²)', 'List Price', 'Survey Reference']));
        $writer->addRow(Row::fromValues(['EX-101', 625, 20_000, 'S-101']));
        $writer->addRow(Row::fromValues(['EX-102', 700, null, 'S-102']));
        $writer->close();

        try {
            $workbook = new UploadedFile($path, 'stands.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
            $validated = $this->actingAs($admin)->post('/administration/stands/bulk/preview', [
                'source_mode' => 'upload',
                'phase_id' => $phase->id,
                'stand_type_id' => $type->id,
                'currency_code' => 'USD',
                'physical_status' => 'planned',
                'shared_list_price' => 15_000,
                'workbook' => $workbook,
            ])->assertSessionHasNoErrors();
            $result = $validated->getSession()->get('stand_bulk_preview_result');
            $this->assertTrue($result['valid']);
            $this->assertSame(2, $result['summary']['total']);
            $this->assertSame(625.0, $result['rows'][0]['area_sqm']);
            $this->assertSame(15_000.0, $result['rows'][1]['effective_list_price']);
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }

    public function test_administrator_can_open_the_phase_one_workspace(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->get('/administration')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/index')
                ->where('summary.branches', 1)
                ->where('summary.roles', 8));
    }

    public function test_administrator_can_open_each_property_operations_workspace(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        foreach (['developments', 'development-phases', 'stand-types', 'stands', 'clients', 'stand-allocations'] as $resource) {
            $this->actingAs($admin)
                ->get("/administration/{$resource}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('administration/resource')
                    ->where('resource.key', $resource));
        }
    }

    public function test_administrator_can_open_a_branch_operations_detail_page(): void
    {
        $this->seed(OperationalDemoSeeder::class);
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::where('organization_id', $admin->organization_id)->where('code', 'HQ')->firstOrFail();

        $this->actingAs($admin)
            ->get("/administration/branches/{$branch->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/branches/show')
                ->where('branch.id', $branch->id)
                ->where('branch.code', 'HQ')
                ->where('summary.currency', 'USD')
                ->where('summary.stands', fn ($value) => $value > 0)
                ->where('summary.users', fn ($value) => $value > 0)
                ->has('allocationChart', 4)
                ->has('standChart', 5)
                ->has('stands', fn (Assert $stands) => $stands->has('0.allocationId')->has('0.standId')->has('0.clientId')->etc()));
    }

    public function test_branch_detail_page_respects_branch_access(): void
    {
        $this->seed(OperationalDemoSeeder::class);
        $manager = User::where('email', 'tawanda.ncube@alphaland.test')->firstOrFail();
        $headOffice = Branch::where('organization_id', $manager->organization_id)->where('code', 'HQ')->firstOrFail();

        $this->actingAs($manager)
            ->get("/administration/branches/{$headOffice->id}")
            ->assertNotFound();
    }

    public function test_stands_workspace_can_be_filtered_by_dashboard_inventory_status(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $availableStands = Stand::query()->where('physical_status', 'available')->count();

        $this->actingAs($admin)
            ->get('/administration/stands?status=available')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/resource')
                ->where('resource.key', 'stands')
                ->where('filters.status', 'available')
                ->where('records.total', $availableStands)
                ->where('records.data', fn ($records) => collect($records)->every(fn ($stand) => $stand['physical_status'] === 'available')));
    }

    public function test_stands_map_hides_allocated_inventory_by_default_and_can_reveal_it(): void
    {
        $this->seed(OperationalDemoSeeder::class);
        $admin = User::query()->where('email', 'test@example.com')->firstOrFail();
        $session = [BranchAccessService::SESSION_KEY => $admin->home_branch_id];

        $this->actingAs($admin)->withSession($session)->get('/administration/stands/map')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('property-operations/stand-map')
                ->where('filters.hide_allocated', true)
                ->where('summary.total', 16)
                ->where('summary.visible', 8)
                ->where('summary.withGeometry', 8)
                ->where('stands.0.geometry.type', 'Polygon')
                ->where('stands', fn ($stands) => collect($stands)->every(fn ($stand) => $stand['status'] !== 'allocated')));

        $this->actingAs($admin)->withSession($session)->get('/administration/stands/map?hide_allocated=0')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.hide_allocated', false)
                ->where('summary.visible', 16)
                ->has('stands', 16));

        $this->actingAs($admin)->withSession($session)->get('/administration/stands/map?hide_allocated=0&area_min=650&area_max=700')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.area_min', '650')
                ->where('filters.area_max', '700')
                ->has('stands', 4)
                ->where('stands', fn ($stands) => collect($stands)->every(fn ($stand) => $stand['area'] >= 650 && $stand['area'] <= 700)));

        $this->actingAs($admin)->withSession($session)->get('/administration/stands/map?area_min=900&area_max=500')
            ->assertSessionHasErrors('area_max');
    }

    public function test_administrator_can_open_each_finance_and_cash_control_workspace(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        foreach (['account-charges', 'payment-allocations', 'cash-sessions', 'bank-deposits', 'reconciliation-runs'] as $resource) {
            $this->actingAs($admin)
                ->get("/administration/{$resource}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('administration/resource')
                    ->where('resource.key', $resource));
        }
        $this->actingAs($admin)->get('/administration/payments')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('payments/index')
                ->where('systemTimezone', 'Africa/Harare')
                ->has('accounts')
                ->has('methods'));
    }

    public function test_phase_one_records_are_organization_scoped(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $otherOrganization = Organization::create([
            'code' => 'OTHER',
            'legal_name' => 'Other Organization',
            'base_currency_code' => 'USD',
            'timezone' => 'Africa/Harare',
            'status' => 'active',
        ]);
        Branch::create([
            'organization_id' => $otherOrganization->id,
            'code' => 'OTHER-HQ',
            'name' => 'Other Head Office',
            'timezone' => 'Africa/Harare',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/administration/branches')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('administration/resource')
                ->has('records.data', 1)
                ->where('records.data.0.code', 'HQ'));
    }

    public function test_administrator_can_create_a_branch_and_an_audit_event(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->post('/administration/branches', [
                'code' => 'BYO',
                'name' => 'Bulawayo Branch',
                'timezone' => 'Africa/Harare',
                'address' => 'Bulawayo',
                'phone' => null,
                'email' => 'byo@example.com',
                'status' => 'active',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('branches', [
            'organization_id' => $admin->organization_id,
            'code' => 'BYO',
        ]);
        $this->assertDatabaseHas('audit_events', [
            'organization_id' => $admin->organization_id,
            'event_type' => 'branches.created',
            'actor_id' => $admin->id,
        ]);
        $this->assertSame(64, strlen(AuditEvent::firstOrFail()->event_hash));
    }

    public function test_administrator_can_set_up_a_development_and_allocate_a_stand_to_a_client(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::where('organization_id', $admin->organization_id)->firstOrFail();
        $standType = StandType::where('organization_id', $admin->organization_id)->firstOrFail();

        $this->actingAs($admin)->post('/administration/developments', [
            'code' => 'SUNSET',
            'name' => 'Sunset Park',
            'location' => 'Harare West',
            'description' => 'Residential land development.',
            'status' => 'active',
        ])->assertRedirect();

        $development = Development::where('organization_id', $admin->organization_id)->where('code', 'SUNSET')->firstOrFail();

        $this->actingAs($admin)->post('/administration/development-phases', [
            'development_id' => $development->id,
            'code' => 'P1',
            'name' => 'Phase 1',
            'survey_status' => 'approved',
            'planned_completion_date' => '2027-03-31',
        ])->assertRedirect();

        $phase = DevelopmentPhase::where('development_id', $development->id)->where('code', 'P1')->firstOrFail();

        $this->actingAs($admin)->post('/administration/stands', [
            'phase_id' => $phase->id,
            'stand_type_id' => $standType->id,
            'stand_no' => '101',
            'area_sqm' => '500.00',
            'list_price' => '25000.00',
            'currency_code' => 'USD',
            'physical_status' => 'available',
            'survey_reference' => 'SG-101',
            'geo_json' => '{"type":"Point","coordinates":[31.05,-17.82]}',
        ])->assertRedirect();

        $stand = Stand::where('phase_id', $phase->id)->where('stand_no', '101')->firstOrFail();
        $this->actingAs($admin)->get('/administration/stands?status=available')->assertOk()->assertInertia(fn (Assert $page) => $page->where('standStats.total', 1)->where('standStats.available', 1)->where('standStats.allocated', 0));
        $this->actingAs($admin)->get('/administration/stands?status=reserved')->assertOk()->assertInertia(fn (Assert $page) => $page->where('standStats.total', 0)->where('standStats.available', 0));

        $this->actingAs($admin)->post('/administration/clients', [
            'owning_branch_id' => $branch->id,
            'first_name' => 'Rudo',
            'middle_names' => null,
            'last_name' => 'Moyo',
            'national_id' => '63-123456-A-01',
            'phone_normalized' => '+263 77 123 4567',
            'status' => 'active',
        ])->assertRedirect();

        $client = Client::where('organization_id', $admin->organization_id)->where('client_no', 'CLI-0001')->firstOrFail();
        $clientFile = ClientFile::where('client_id', $client->id)->firstOrFail();

        $this->assertNotSame('63-123456-A-01', $client->national_id_encrypted);
        $this->assertSame('+263771234567', $client->phone_normalized);
        $this->assertSame('CF-CLI-0001', $clientFile->file_no);

        $this->actingAs($admin)->post('/administration/stand-allocations', [
            'client_file_id' => $clientFile->id,
            'stand_id' => $stand->id,
            'branch_id' => $branch->id,
            'category' => 'cash',
            'allocated_at' => null,
            'effective_price' => '24000.00',
            'currency_code' => 'USD',
            'status' => 'allocated',
        ])->assertRedirect();

        $this->assertDatabaseHas('stand_allocations', [
            'client_file_id' => $clientFile->id,
            'stand_id' => $stand->id,
            'branch_id' => $branch->id,
            'status' => 'allocated',
            'created_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('client_accounts', [
            'client_file_id' => $clientFile->id,
            'allocation_id' => $stand->allocations()->firstOrFail()->id,
            'currency_code' => 'USD',
            'status' => 'open',
        ]);
        $this->assertDatabaseHas('audit_events', [
            'organization_id' => $admin->organization_id,
            'event_type' => 'stand-allocations.created',
            'actor_id' => $admin->id,
        ]);
    }

    public function test_administrator_can_run_the_charge_to_receipt_and_reconciliation_workflow(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::where('organization_id', $admin->organization_id)->firstOrFail();

        $this->actingAs($admin)->post('/administration/clients', [
            'owning_branch_id' => $branch->id,
            'first_name' => 'Tariro',
            'last_name' => 'Dube',
            'status' => 'active',
        ])->assertRedirect();

        $client = Client::where('client_no', 'CLI-0001')->firstOrFail();
        $clientFile = ClientFile::where('client_id', $client->id)->firstOrFail();
        $account = ClientAccount::create([
            'client_file_id' => $clientFile->id,
            'account_no' => 'ACC-FIN-1',
            'currency_code' => 'USD',
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $this->actingAs($admin)->post('/administration/account-charges', [
            'account_id' => $account->id,
            'charge_type' => 'stand_price',
            'description' => 'Stand purchase charge',
            'amount' => '1000.00',
            'currency_code' => 'USD',
            'due_date' => '2026-10-31',
            'status' => 'posted',
        ])->assertRedirect();
        $charge = AccountCharge::where('account_id', $account->id)->firstOrFail();

        $this->actingAs($admin)->post('/administration/cash-sessions', [
            'branch_id' => $branch->id,
            'cashier_id' => $admin->id,
            'opened_at' => '2026-09-28 08:00:00',
            'opening_float' => '100.00',
            'expected_cash' => '100.00',
            'declared_cash' => null,
            'currency_code' => 'USD',
            'status' => 'open',
        ])->assertRedirect();
        $cashSession = CashSession::where('branch_id', $branch->id)->firstOrFail();
        $cashMethod = PaymentMethod::where('code', 'CASH')->firstOrFail();
        $receivedAt = CarbonImmutable::now($branch->timezone)->format('Y-m-d\TH:i');
        $expectedReceivedAt = CarbonImmutable::parse($receivedAt, $branch->timezone)->utc();

        $this->actingAs($admin)->post('/administration/payments', [
            'account_id' => $account->id,
            'cash_session_id' => $cashSession->id,
            'amount' => '1000.00',
            'method_id' => $cashMethod->id,
            'external_reference' => 'CASH-REFERENCE-SHOULD-BE-IGNORED',
            'received_at' => $receivedAt,
            'allocations' => [['charge_id' => $charge->id, 'amount' => '1000.00']],
        ])->assertRedirect();
        $payment = Payment::where('account_id', $account->id)->firstOrFail();
        $this->assertSame('pending', $payment->status);
        $this->assertTrue($payment->received_at->equalTo($expectedReceivedAt));
        $this->assertNull($payment->external_reference);
        $this->assertSame('posted', $charge->fresh()->status);
        $this->assertSame('100.0000', $cashSession->fresh()->expected_cash);
        $this->assertFalse(Receipt::where('payment_id', $payment->id)->exists());
        $this->actingAs($admin)->post('/administration/payment-allocations', [
            'payment_id' => $payment->id,
            'charge_id' => $charge->id,
            'amount' => 1,
        ])->assertStatus(405);

        $approver = User::factory()->create([
            'organization_id' => $admin->organization_id,
            'home_branch_id' => $branch->id,
            'status' => 'active',
        ]);
        setPermissionsTeamId($admin->organization_id);
        $approver->assignRole(Role::where('code', 'SUPER_ADMIN')->firstOrFail());
        $approval = ApprovalRequest::whereKey($payment->approval_request_id)->firstOrFail();
        $this->actingAs($admin)->get("/administration/payments/{$payment->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('payments/show')
                ->where('payment.approval_request_id', $approval->id)
                ->where('payment.status', 'pending')
                ->where('payment.can_approve', false)
                ->where('payment.is_maker', true));
        $this->actingAs($admin)->get('/approvals')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('approvals/index')
                ->where('canApprovePayments', true)
                ->where('approvals', function ($items) use ($approval, $payment): bool {
                    $item = collect($items)->firstWhere('id', $approval->id);

                    return $item !== null
                        && $item['is_maker'] === true
                        && $item['payment']['id'] === $payment->id
                        && (float) $item['payment']['allocated_amount'] === 1000.0
                        && (float) $item['payment']['unallocated_amount'] === 0.0;
                }));
        $this->actingAs($approver)->get("/administration/payments/{$payment->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('payments/show')
                ->where('payment.can_approve', true)
                ->where('payment.is_maker', false));
        $this->actingAs($admin)->post("/approvals/{$approval->id}/decision", [
            'action' => 'approve',
            'note' => 'Self approval must be rejected.',
        ])->assertStatus(422);
        $this->assertSame('pending', $approval->fresh()->status);
        $this->actingAs($approver)->post("/approvals/{$approval->id}/decision", [
            'action' => 'approve',
            'note' => 'Cash counted and client account checked.',
        ])->assertRedirect();

        $this->actingAs($admin)->get('/administration/clients')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('resource.columns.4.key', 'last_payment')
            ->where('resource.columns.4.label', 'Last payment')
            ->where('records.data.0.last_payment.date', $expectedReceivedAt->toIso8601String())
            ->where('records.data.0.last_payment.amount', 1000)
            ->where('records.data.0.last_payment.currency', 'USD'));

        $this->assertSame('paid', $charge->fresh()->status);
        $this->assertSame('1100.0000', $cashSession->fresh()->expected_cash);
        $receipt = Receipt::where('payment_id', $payment->id)->firstOrFail();
        $this->assertStringStartsWith('RCT-', $receipt->receipt_no);
        $this->assertSame(64, strlen($receipt->content_hash));

        $bankAccount = BankAccount::create([
            'organization_id' => $admin->organization_id,
            'branch_id' => $branch->id,
            'bank_name' => 'Test Bank',
            'account_name' => 'Alpha Land',
            'account_mask' => '****9001',
            'currency_code' => 'USD',
            'active' => true,
        ]);

        $this->actingAs($admin)->post('/administration/bank-deposits', [
            'branch_id' => $branch->id,
            'bank_account_id' => $bankAccount->id,
            'deposit_date' => '2026-09-28',
            'amount' => '1000.00',
            'currency_code' => 'USD',
            'reference' => 'DEP-001',
            'status' => 'cleared',
        ])->assertRedirect();

        $this->actingAs($admin)->post('/administration/reconciliation-runs', [
            'branch_id' => $branch->id,
            'business_date' => '2026-09-28',
            'run_no' => 1,
            'expected_total' => '1100.00',
            'declared_total' => '1100.00',
            'deposited_total' => '1000.00',
            'currency_code' => 'USD',
            'status' => 'approved',
        ])->assertRedirect();

        $reconciliation = ReconciliationRun::firstOrFail();
        $this->assertSame('0.0000', $reconciliation->variance);
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'receipts.issued',
            'subject_id' => $receipt->id,
            'actor_id' => $approver->id,
        ]);
    }

    public function test_user_without_phase_one_permission_is_denied(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $user = User::factory()->create([
            'organization_id' => $admin->organization_id,
            'home_branch_id' => $admin->home_branch_id,
        ]);

        $this->actingAs($user)
            ->get('/administration')
            ->assertForbidden();
    }
}
