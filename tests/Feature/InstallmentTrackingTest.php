<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Models\StandAllocation;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InstallmentTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_administrator_can_open_detailed_stand_client_and_allocation_pages(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $allocation = StandAllocation::with(['stand', 'clientFile.client'])->firstOrFail();

        $this->actingAs($admin)->get("/administration/stands/{$allocation->stand_id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('property-operations/stand-show')
                ->where('stand.id', $allocation->stand_id)
                ->has('allocations', 1));

        $this->actingAs($admin)->get("/administration/clients/{$allocation->clientFile->client_id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('property-operations/client-show')
                ->where('client.id', $allocation->clientFile->client_id)
                ->where('summary.allocations', 1));

        $this->actingAs($admin)->get("/administration/stand-allocations/{$allocation->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('property-operations/allocation-show')
                ->where('allocation.id', $allocation->id)
                ->has('installments', 4)
                ->has('payments', 1)
                ->has('timeline'));
    }

    public function test_property_operations_support_combined_person_branch_status_and_stand_search(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::where('code', 'NORTH')->firstOrFail();
        $allocation = StandAllocation::where('branch_id', $branch->id)->with('clientFile.client')->firstOrFail();

        $this->actingAs($admin)
            ->get('/administration/stand-allocations?search='.urlencode($allocation->clientFile->client->first_name)."&branch={$branch->id}&status=allocated")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.branch', (string) $branch->id)
                ->where('filters.status', 'allocated')
                ->where('records.total', 1)
                ->where('records.data.0.id', $allocation->id));

        $this->actingAs($admin)
            ->get('/administration/stands?search='.urlencode($allocation->stand->stand_no))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('records.total', 1)
                ->where('records.data.0.id', $allocation->stand_id));
    }

    public function test_administrator_can_generate_an_installment_schedule_with_automatic_reminders(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $allocation = StandAllocation::firstOrFail();
        $allocation->installments()->delete();

        $this->actingAs($admin)->post("/administration/stand-allocations/{$allocation->id}/installments", [
            'first_due_date' => now()->addMonth()->toDateString(),
            'installment_count' => 5,
            'frequency_months' => 1,
            'notes' => 'Five-month repayment plan.',
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertSame(5, $allocation->installments()->count());
        $this->assertSame(5, $allocation->installments()->withCount('reminders')->get()->sum('reminders_count'));
        $this->assertEqualsWithDelta(
            (float) $allocation->account->charges()->firstOrFail()->amount - (float) $allocation->account->charges()->firstOrFail()->paymentAllocations()->sum('amount'),
            (float) $allocation->installments()->sum('amount_due'),
            0.01,
        );
    }

    public function test_administrator_can_record_an_installment_payment_and_receive_a_receipt(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $installment = Installment::where('status', 'scheduled')->firstOrFail();
        $allocation = $installment->allocation;
        $method = PaymentMethod::where('code', 'BANK')->firstOrFail();
        $amount = min(250, (float) $installment->amount_due);

        $this->actingAs($admin)->post("/administration/stand-allocations/{$allocation->id}/installments/{$installment->id}/payments", [
            'amount' => $amount,
            'method_id' => $method->id,
            'external_reference' => 'TEST-INSTALLMENT-001',
            'received_at' => now()->toDateTimeString(),
        ])->assertRedirect()->assertSessionHas('success');

        $payment = Payment::where('external_reference', 'TEST-INSTALLMENT-001')->firstOrFail();
        $this->assertDatabaseHas('payment_allocations', [
            'payment_id' => $payment->id,
            'installment_id' => $installment->id,
            'amount' => $amount,
        ]);
        $this->assertEqualsWithDelta($amount, (float) $installment->fresh()->amount_paid, 0.01);
        $this->assertTrue(Receipt::where('payment_id', $payment->id)->exists());
    }

    public function test_branch_manager_cannot_view_or_change_another_branch_allocation(): void
    {
        $manager = User::where('email', 'rudo.moyo@alphaland.test')->firstOrFail();
        $allocation = StandAllocation::whereHas('branch', fn ($query) => $query->where('code', 'BYO'))->firstOrFail();
        $installment = $allocation->installments()->where('status', 'scheduled')->firstOrFail();
        $method = PaymentMethod::where('code', 'BANK')->firstOrFail();

        $this->actingAs($manager)->get("/administration/stand-allocations/{$allocation->id}")->assertNotFound();
        $this->actingAs($manager)->post("/administration/stand-allocations/{$allocation->id}/installments/{$installment->id}/payments", [
            'amount' => 10,
            'method_id' => $method->id,
            'external_reference' => 'FORBIDDEN-PAYMENT',
        ])->assertForbidden();
    }
}
