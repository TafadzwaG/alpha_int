<?php

namespace Tests\Feature;

use App\Models\AccountCharge;
use App\Models\AuditEvent;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\ClientAccount;
use App\Models\ClientFile;
use App\Models\Development;
use App\Models\DevelopmentPhase;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Models\ReconciliationRun;
use App\Models\Stand;
use App\Models\StandType;
use App\Models\User;
use Database\Seeders\PhaseOneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PhaseOneAdministrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PhaseOneSeeder::class);
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
                ->where('summary.roles', 7));
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

    public function test_administrator_can_open_each_finance_and_cash_control_workspace(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        foreach (['account-charges', 'payments', 'payment-allocations', 'receipts', 'cash-sessions', 'bank-deposits', 'reconciliation-runs'] as $resource) {
            $this->actingAs($admin)
                ->get("/administration/{$resource}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('administration/resource')
                    ->where('resource.key', $resource));
        }
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

        $this->actingAs($admin)->post('/administration/clients', [
            'owning_branch_id' => $branch->id,
            'client_no' => 'CLI-0001',
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
            'client_no' => 'CLI-FIN-1',
            'first_name' => 'Tariro',
            'last_name' => 'Dube',
            'status' => 'active',
        ])->assertRedirect();

        $client = Client::where('client_no', 'CLI-FIN-1')->firstOrFail();
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

        $this->actingAs($admin)->post('/administration/payments', [
            'account_id' => $account->id,
            'branch_id' => $branch->id,
            'cash_session_id' => $cashSession->id,
            'amount' => '1000.00',
            'currency_code' => 'USD',
            'method_id' => $cashMethod->id,
            'external_reference' => null,
            'received_at' => '2026-09-28 09:00:00',
            'status' => 'pending',
        ])->assertRedirect();
        $payment = Payment::where('account_id', $account->id)->firstOrFail();

        $this->actingAs($admin)->post('/administration/payment-allocations', [
            'payment_id' => $payment->id,
            'charge_id' => $charge->id,
            'amount' => '1000.00',
        ])->assertRedirect();

        $this->actingAs($admin)->put("/administration/payments/{$payment->id}", [
            'account_id' => $account->id,
            'branch_id' => $branch->id,
            'cash_session_id' => $cashSession->id,
            'amount' => '1000.00',
            'currency_code' => 'USD',
            'method_id' => $cashMethod->id,
            'external_reference' => null,
            'received_at' => '2026-09-28 09:00:00',
            'status' => 'approved',
        ])->assertRedirect();

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
            'actor_id' => $admin->id,
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
