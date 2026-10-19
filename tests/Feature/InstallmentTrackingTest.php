<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\Branch;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Models\Role;
use App\Models\StandAllocation;
use App\Models\User;
use App\Models\UserBranchAccess;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
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
            'notes' => 'Partial payment agreed during branch visit.',
            'received_at' => now()->toDateTimeString(),
        ])->assertRedirect()->assertSessionHas('success');

        $payment = Payment::where('external_reference', 'TEST-INSTALLMENT-001')->firstOrFail();
        $this->assertSame('Partial payment agreed during branch visit.', $payment->notes);
        $this->assertSame('pending', $payment->status);
        $this->assertFalse(Receipt::where('payment_id', $payment->id)->exists());
        $this->assertEqualsWithDelta(0, (float) $installment->fresh()->amount_paid, 0.01);

        $approver = User::factory()->create([
            'organization_id' => $admin->organization_id,
            'home_branch_id' => $allocation->branch_id,
            'status' => 'active',
        ]);
        setPermissionsTeamId($admin->organization_id);
        $approver->assignRole(Role::where('code', 'SUPER_ADMIN')->firstOrFail());
        $approval = ApprovalRequest::whereKey($payment->approval_request_id)->firstOrFail();
        $this->actingAs($approver)->post("/approvals/{$approval->id}/decision", [
            'action' => 'approve',
            'note' => 'Bank receipt independently checked.',
        ])->assertRedirect();
        $payment->refresh();

        $this->actingAs($admin)->get('/administration/payments/'.$payment->id)->assertOk()->assertInertia(fn (Assert $page) => $page->component('payments/show')->where('payment.receipt_available', true)->where('payment.notes', $payment->notes));
        $pdf = $this->actingAs($admin)->get('/administration/payments/'.$payment->id.'/receipt')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
        preg_match('/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([0-9.]+)/', $pdf->getContent(), $mediaBox);
        $this->assertNotEmpty($mediaBox);
        $this->assertLessThan(240, (float) $mediaBox[1], 'POS receipt should use narrow 80 mm paper, not A4.');
        $verify = URL::signedRoute('administration.payments.verify', ['payment' => $payment->id, 'receipt' => $payment->receipt->public_id]);
        $this->actingAs($admin)->get($verify)->assertOk()->assertInertia(fn (Assert $page) => $page->where('verified', true));
        $this->actingAs($admin)->get($verify.'&tampered=1')->assertForbidden();
        $this->actingAs($admin)->get('/administration/payments?search=TEST-INSTALLMENT-001&status=approved')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 1)->where('paymentStats.total', 1));
        $this->actingAs($admin)->get('/administration/payments/export/pdf?ids[]='.$payment->id)->assertOk()->assertHeader('content-type', 'application/pdf');
        $excel = $this->actingAs($admin)->get('/administration/payments/export/excel?ids[]='.$payment->id)->assertOk();
        $path = $excel->baseResponse->getFile()->getPathname();
        $zip = new \ZipArchive;
        $zip->open($path);
        $this->assertStringContainsString('TEST-INSTALLMENT-001', $zip->getFromName('xl/worksheets/sheet2.xml'));
        $zip->close();
        unlink($path);

        $this->assertDatabaseHas('payment_allocations', [
            'payment_id' => $payment->id,
            'installment_id' => $installment->id,
            'amount' => $amount,
        ]);
        $this->assertEqualsWithDelta($amount, (float) $installment->fresh()->amount_paid, 0.01);
        $this->assertTrue(Receipt::where('payment_id', $payment->id)->exists());
    }

    public function test_cashier_can_record_a_payment_from_the_client_detail_page(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $homeBranch = Branch::where('organization_id', $admin->organization_id)->where('code', 'HQ')->firstOrFail();
        $cashier = User::factory()->create([
            'name' => 'Client Page Cashier',
            'email' => 'client-page-cashier@example.test',
            'organization_id' => $admin->organization_id,
            'home_branch_id' => $homeBranch->id,
            'status' => 'active',
        ]);
        setPermissionsTeamId($admin->organization_id);
        $cashier->assignRole(Role::where('code', 'CASHIER')->firstOrFail());
        UserBranchAccess::create([
            'user_id' => $cashier->id,
            'branch_id' => $homeBranch->id,
            'access_level' => 'operational',
            'active' => true,
        ]);
        $allocation = StandAllocation::query()
            ->where('branch_id', $cashier->home_branch_id)
            ->whereHas('installments', fn ($query) => $query->where('status', 'scheduled'))
            ->with('clientFile.client')
            ->firstOrFail();
        $installment = $allocation->installments()->where('status', 'scheduled')->firstOrFail();
        $method = PaymentMethod::where('code', 'BANK')->firstOrFail();

        $this->actingAs($cashier)
            ->get("/administration/clients/{$allocation->clientFile->client_id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('property-operations/client-show')
                ->where('actions.capturePayment', true)
                ->has('paymentOptions.accounts', 1)
                ->where('paymentOptions.accounts.0.id', (string) $allocation->account->id)
                ->has('paymentOptions.accounts.0.charges')
                ->where('paymentOptions.methods', fn ($methods) => collect($methods)->contains(
                    fn ($item) => $item['id'] === (string) $method->id
                        && array_key_exists('requires_reference', $item)
                        && array_key_exists('cash_equivalent', $item)
                )));

        $this->actingAs($cashier)
            ->post('/administration/payments', [
                'account_id' => $allocation->account->id,
                'amount' => min(25, (float) $installment->amount_due),
                'method_id' => $method->id,
                'external_reference' => 'CASHIER-CLIENT-PAYMENT-001',
                'received_at' => now()->subMinute()->format('Y-m-d H:i:s'),
                'notes' => 'Captured from the client detail page.',
                'allocations' => [],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payments', [
            'external_reference' => 'CASHIER-CLIENT-PAYMENT-001',
            'made_by' => $cashier->id,
            'status' => 'pending',
        ]);
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
