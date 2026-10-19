<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Client;
use App\Models\Receipt;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleTestUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReceiptRegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_uses_receipt_snapshot_and_links_to_payment(): void
    {
        $this->seed(DatabaseSeeder::class);
        $receipt = Receipt::with('payment')->firstOrFail();
        $snapshot = $receipt->snapshot_json;
        $snapshot['amount'] = '123.45';
        $snapshot['client'] = ['name' => 'Original receipt client'];
        $receipt->forceFill(['snapshot_json' => $snapshot])->save();
        $this->actingAs(User::where('email', 'test@example.com')->firstOrFail())
            ->get('/administration/receipts?search='.urlencode($receipt->receipt_no))
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('receipts/index')
            ->where('stats.total', 1)->where('records.data.0.client', 'Original receipt client')
            ->where('records.data.0.amount', 123.45)->where('records.data.0.payment_id', $receipt->payment_id)
            ->where('records.data.0.available', true));
    }

    public function test_receipt_document_preserves_issued_values_and_excludes_internal_notes(): void
    {
        $this->seed(DatabaseSeeder::class);
        $receipt = Receipt::with('payment')->firstOrFail();
        $snapshot = $receipt->snapshot_json;
        $snapshot['client'] = ['name' => 'Original customer', 'number' => 'ORIGINAL-001'];
        $snapshot['amount'] = 150;
        $snapshot['allocations'] = [['charge' => 'Original charge', 'amount' => 100, 'installment' => 2]];
        $receipt->update(['snapshot_json' => $snapshot]);
        $receipt->payment->update(['notes' => 'Internal staff conversation']);
        $this->actingAs(User::where('email', 'test@example.com')->firstOrFail())
            ->get('/administration/payments/'.$receipt->payment_id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('receiptDocument.client', 'Original customer')->where('receiptDocument.client_no', 'ORIGINAL-001')
            ->where('receiptDocument.amount', 150)->where('receiptDocument.notes', null)
            ->where('receiptDocument.lines.0.description', 'Original charge')->where('receiptDocument.lines.0.amount', 100)
            ->where('receiptDocument.lines.1.amount', 50)->where('payment.notes', 'Internal staff conversation'));
    }

    public function test_cashier_sees_only_accessible_branch_and_can_filter_receipts(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(RoleTestUsersSeeder::class);
        $user = User::where('email', 'cashier@roles.alpha.test')->firstOrFail();
        $expected = Receipt::whereHas('payment', fn ($q) => $q->where('branch_id', $user->home_branch_id))->count();
        $this->actingAs($user)->get('/administration/receipts')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('receipts/index')->where('stats.total', $expected)->has('branches', 1));
        $other = Branch::where('id', '!=', $user->home_branch_id)->firstOrFail();
        $this->get('/administration/receipts?branch='.$other->id)->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 0));
        $otherClient = Client::where('owning_branch_id', $other->id)->firstOrFail();
        $this->get("/administration/clients/{$otherClient->id}/receipts/pdf")->assertNotFound();
        $this->get("/administration/clients/{$otherClient->id}/statement/pdf")->assertNotFound();
        $this->get('/administration/receipts?issued_from=2099-01-01')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 0));
        $this->get('/administration/receipts?sort=invalid')->assertSessionHasErrors('sort');
    }

    public function test_unapproved_payment_receipts_are_marked_unavailable(): void
    {
        $this->seed(DatabaseSeeder::class);
        $receipt = Receipt::with('payment')->firstOrFail();
        $receipt->payment->forceFill(['status' => 'reversed'])->save();
        $this->actingAs(User::where('email', 'test@example.com')->firstOrFail())
            ->get('/administration/receipts?availability=unavailable')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('records.total', 1)->where('records.data.0.available', false)->where('records.data.0.payment_status', 'reversed'));
        $this->get('/administration/payments/'.$receipt->payment_id.'/receipt')->assertStatus(409);
    }

    public function test_staff_can_print_pos_receipts_and_download_all_client_documents(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::where('email', 'test@example.com')->firstOrFail();
        $receipt = Receipt::with('payment.account.clientFile.client')->firstOrFail();
        $client = $receipt->payment->account->clientFile->client;

        $this->actingAs($user)
            ->get("/administration/payments/{$receipt->payment_id}/receipt/print")
            ->assertOk()
            ->assertSee('Print POS receipt', false)
            ->assertSee('Back to payment')
            ->assertSee('All payments')
            ->assertSee($receipt->receipt_no);

        $this->get("/administration/clients/{$client->id}/receipts/print")
            ->assertOk()
            ->assertSee('80 mm thermal/POS paper size', false)
            ->assertSee('Back to client')
            ->assertSee('Receipt register')
            ->assertSee($receipt->receipt_no);

        $this->get("/administration/clients/{$client->id}/receipts/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->get("/administration/clients/{$client->id}/statement/print")
            ->assertOk()
            ->assertSee('Client account statement')
            ->assertSee('Download PDF')
            ->assertSee('ACCOUNT STATEMENT')
            ->assertSee($client->client_no);

        $this->get("/administration/clients/{$client->id}/statement/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
