<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\BankDeposit;
use App\Models\CustomerInvoice;
use App\Models\ExchangeRate;
use App\Models\Expense;
use App\Models\GlAccount;
use App\Models\JournalEntry;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;

class SourceDocumentPostingService
{
    public function __construct(private readonly GeneralLedgerService $ledger) {}

    public function postCharge(AccountCharge $charge): void
    {
        if ($charge->source_type === CustomerInvoice::class) {
            return;
        }
        if ($charge->status === 'void') {
            $this->reverseSource($charge, $charge->created_by, 'Charge voided');

            return;
        }
        if (! in_array($charge->status, ['posted', 'partially_paid', 'paid'], true) || ! $charge->posted_at) {
            return;
        }
        $charge->loadMissing('account.clientFile.client');
        $organizationId = (int) $charge->account?->clientFile?->client?->organization_id;
        $branchId = $charge->account?->clientFile?->branch_id;
        if (! $organizationId) {
            return;
        }
        $this->post($organizationId, $branchId, $charge->created_by, $charge, 'sales', $charge->posted_at->toDateString(), $charge->currency_code, (float) $charge->amount, 'accounts_receivable', 'sales_revenue', $charge->account_id, "Client charge {$charge->charge_type}");
    }

    public function postBankDeposit(BankDeposit $deposit): void
    {
        if (! in_array($deposit->status, ['approved', 'cleared'], true) || $deposit->journal_entry_id) {
            return;
        }
        $deposit->loadMissing('bankAccount');
        $organizationId = (int) $deposit->bankAccount?->organization_id;
        if (! $organizationId) {
            return;
        }
        $accounts = GlAccount::query()->where('organization_id', $organizationId)
            ->whereIn('system_key', ['bank', 'cash_clearing'])->pluck('id', 'system_key');
        if (! isset($accounts['bank'], $accounts['cash_clearing'])) {
            return;
        }
        $journal = $this->ledger->createSystemJournal($organizationId, $deposit->branch_id, $deposit->approved_by ?: $deposit->deposited_by, [
            'entry_date' => $deposit->deposit_date->toDateString(), 'journal_type' => 'bank_deposit', 'reference' => $deposit->reference,
            'description' => 'Bank deposit '.$deposit->reference, 'currency_code' => $deposit->currency_code,
            'source_type' => BankDeposit::class, 'source_id' => $deposit->id,
            'lines' => [
                ['gl_account_id' => $accounts['bank'], 'debit' => (float) $deposit->amount, 'credit' => 0, 'description' => 'Banked cash'],
                ['gl_account_id' => $accounts['cash_clearing'], 'debit' => 0, 'credit' => (float) $deposit->amount, 'description' => 'Cash clearing transfer'],
            ],
        ]);
        $deposit->forceFill(['journal_entry_id' => $journal?->id])->saveQuietly();
    }

    public function postPayment(Payment $payment): void
    {
        if ($payment->status === 'reversed') {
            $this->reverseSource($payment, $payment->approved_by ?: $payment->made_by, 'Payment reversed');

            return;
        }
        if ($payment->status !== 'approved') {
            return;
        }
        $payment->loadMissing('account.clientFile.client', 'method');
        $organizationId = (int) $payment->account?->clientFile?->client?->organization_id;
        if (! $organizationId) {
            return;
        }
        $cashKey = in_array($payment->method?->code, ['BANK', 'CARD', 'MOBILE'], true) ? 'bank' : 'cash_clearing';
        $this->post($organizationId, $payment->branch_id, $payment->approved_by ?: $payment->made_by, $payment, 'cash_receipt', $payment->received_at->toDateString(), $payment->currency_code, (float) $payment->amount, $cashKey, 'accounts_receivable', $payment->account_id, 'Client receipt '.$payment->external_reference);
    }

    public function postExpense(Expense $expense): void
    {
        if ($expense->status === 'cancelled') {
            $this->reverseSource($expense, $expense->approved_by ?: $expense->made_by, 'Expense cancelled');
            $this->reverseSource($expense, $expense->approved_by ?: $expense->made_by, 'Expense payment cancelled', 'expense-payment');

            return;
        }
        if (! in_array($expense->status, ['approved', 'paid'], true)) {
            return;
        }
        $organizationId = (int) $expense->branch?->organization_id;
        if (! $organizationId) {
            $expense->loadMissing('branch');
            $organizationId = (int) $expense->branch?->organization_id;
        }
        if (! $organizationId) {
            return;
        }
        $this->post($organizationId, $expense->branch_id, $expense->approved_by ?: $expense->made_by, $expense, 'expense', $expense->incurred_at->toDateString(), $expense->currency_code, (float) $expense->total_amount, 'operating_expense', 'accounts_payable', null, 'Expense '.$expense->expense_no, null, $expense->accounting_dimension_id);

        if ($expense->status === 'paid') {
            $this->post($organizationId, $expense->branch_id, $expense->approved_by ?: $expense->made_by, $expense, 'cash_disbursement', now()->toDateString(), $expense->currency_code, (float) $expense->total_amount, 'accounts_payable', 'bank', null, 'Payment of expense '.$expense->expense_no, 'expense-payment', $expense->accounting_dimension_id);
        }
    }

    private function post(int $organizationId, ?int $branchId, ?int $userId, object $source, string $type, string $date, string $currency, float $amount, string $debitKey, string $creditKey, ?int $clientAccountId, string $description, ?string $sourceType = null, ?int $dimensionId = null): void
    {
        $accounts = GlAccount::query()->where('organization_id', $organizationId)->whereIn('system_key', [$debitKey, $creditKey])->pluck('id', 'system_key');
        if (! isset($accounts[$debitKey], $accounts[$creditKey]) || $amount <= 0) {
            return;
        }
        $this->ledger->createSystemJournal($organizationId, $branchId, $userId, [
            'entry_date' => $date, 'journal_type' => $type, 'reference' => class_basename($source).' #'.$source->id,
            'description' => $description, 'currency_code' => $currency, 'exchange_rate' => $this->exchangeRate($organizationId, $currency, $date),
            'source_type' => $sourceType ?? $source::class, 'source_id' => $source->id,
            'lines' => [
                ['gl_account_id' => $accounts[$debitKey], 'client_account_id' => $clientAccountId, 'accounting_dimension_id' => $dimensionId, 'debit' => $amount, 'credit' => 0, 'description' => $description],
                ['gl_account_id' => $accounts[$creditKey], 'client_account_id' => $clientAccountId, 'accounting_dimension_id' => $dimensionId, 'debit' => 0, 'credit' => $amount, 'description' => $description],
            ],
        ]);
    }

    private function exchangeRate(int $organizationId, string $currency, string $date): float
    {
        $base = Organization::query()->whereKey($organizationId)->value('base_currency_code') ?: 'USD';
        if ($currency === $base) {
            return 1;
        }

        $direct = ExchangeRate::query()->where('base_currency', $currency)->where('quote_currency', $base)
            ->whereNotNull('approved_at')->whereDate('rate_date', '<=', $date)->latest('rate_date')->value('rate');
        if ($direct) {
            return (float) $direct;
        }

        $inverse = ExchangeRate::query()->where('base_currency', $base)->where('quote_currency', $currency)
            ->whereNotNull('approved_at')->whereDate('rate_date', '<=', $date)->latest('rate_date')->value('rate');
        if ($inverse && (float) $inverse !== 0.0) {
            return 1 / (float) $inverse;
        }

        throw new \RuntimeException("No approved {$currency}/{$base} exchange rate exists for {$date}.");
    }

    private function reverseSource(object $source, ?int $userId, string $reason, ?string $sourceType = null): void
    {
        $journal = JournalEntry::query()
            ->where('source_type', $sourceType ?? $source::class)
            ->where('source_id', $source->id)
            ->where('status', 'posted')
            ->first();
        if (! $journal) {
            return;
        }

        $user = $userId ? User::query()->where('organization_id', $journal->organization_id)->find($userId) : null;
        $user ??= User::query()->where('organization_id', $journal->organization_id)->oldest('id')->first();
        if ($user) {
            $this->ledger->reverse($journal, $user, $reason);
        }
    }
}
