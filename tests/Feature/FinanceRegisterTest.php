<?php

namespace Tests\Feature;

use App\Models\BankDeposit;
use App\Models\CashSession;
use App\Models\PettyCashEntry;
use App\Models\User;
use App\Services\FinanceRegister;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleTestUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FinanceRegisterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(RoleTestUsersSeeder::class);
    }

    public function test_all_four_registers_have_scoped_cards_and_filters(): void
    {
        $cashier = User::where('email', 'cashier@roles.alpha.test')->firstOrFail();
        $this->actingAs($cashier);
        foreach (FinanceRegister::KEYS as $key) {
            $this->get('/administration/'.$key)->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('administration/resource')->has('financeCards', 4)
                ->where('records.data', fn ($rows) => collect($rows)->every(fn ($row) => (int) $row['branch_id'] === $cashier->home_branch_id)));
            $this->get('/administration/'.$key.'?date_from=2099-01-01')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 0));
        }
    }

    public function test_cash_variance_and_bank_search_filters_work(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $session = CashSession::firstOrFail();
        $session->update(['declared_cash' => (float) $session->expected_cash - 20]);
        $this->actingAs($admin)->get('/administration/cash-sessions?variance=short')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('records.total', 1)->where('records.data.0.variance', -20)->where('financeCards.3.value', 1));
        $deposit = BankDeposit::with('bankAccount')->firstOrFail();
        $this->get('/administration/bank-deposits?search='.urlencode($deposit->bankAccount->bank_name))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('records.total', BankDeposit::whereHas('bankAccount', fn ($q) => $q->where('bank_name', $deposit->bankAccount->bank_name))->count()));
        $this->get('/administration/expenses?amount_min=9999999')->assertOk()->assertInertia(fn (Assert $page) => $page->where('records.total', 0));
        $this->get('/administration/expenses?date_from=2026-10-10&date_to=2026-01-01')->assertSessionHasErrors('date_to');
    }

    public function test_petty_cash_movements_keep_currencies_separate(): void
    {
        $cashier = User::where('email', 'cashier@roles.alpha.test')->firstOrFail();
        PettyCashEntry::create(['branch_id' => $cashier->home_branch_id, 'entry_type' => 'replenishment', 'amount' => 10, 'currency_code' => 'ZAR', 'posted_at' => now(), 'posted_by' => $cashier->id]);
        $this->actingAs($cashier)->get('/administration/petty-cash-entries')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('financeCards.3.totals', 2)->where('financeCards.3.totals', fn ($totals) => collect($totals)->contains(fn ($total) => $total['currency'] === 'ZAR' && (float) $total['amount'] === 10.0)));
    }

    public function test_scoped_excel_and_branded_pdf_exports_are_available(): void
    {
        $cashier = User::where('email', 'cashier@roles.alpha.test')->firstOrFail();
        $this->actingAs($cashier)->get('/administration/bank-deposits/export/excel')->assertDownload('bank-deposits.xlsx');
        $this->get('/administration/cash-sessions/export/pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->get('/administration/expenses/export/pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->get('/administration/petty-cash-entries/export/excel')->assertDownload('petty-cash-entries.xlsx');
    }
}
