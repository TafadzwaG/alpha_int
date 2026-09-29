<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\CashSession;
use App\Models\DocumentSequence;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Models\StandAllocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AllocationPaymentService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function record(StandAllocation $allocation, Installment $installment, array $data, Request $request): Payment
    {
        return DB::transaction(function () use ($allocation, $installment, $data, $request): Payment {
            $allocation->loadMissing(['account', 'clientFile.client', 'branch', 'stand']);
            $installment = Installment::query()->lockForUpdate()->findOrFail($installment->id);
            $account = $allocation->account;

            if (! $account || (int) $installment->allocation_id !== (int) $allocation->id) {
                throw ValidationException::withMessages(['installment_id' => 'The installment does not belong to this allocation.']);
            }

            $method = PaymentMethod::query()->where('active', true)->findOrFail($data['method_id']);
            if ($method->requires_reference && empty($data['external_reference'])) {
                throw ValidationException::withMessages(['external_reference' => 'A reference is required for this payment method.']);
            }
            if ($method->cash_equivalent && empty($data['cash_session_id'])) {
                throw ValidationException::withMessages(['cash_session_id' => 'Select an open cash session for cash-equivalent payments.']);
            }

            $cashSession = null;
            if (! empty($data['cash_session_id'])) {
                $cashSession = CashSession::query()->lockForUpdate()->findOrFail($data['cash_session_id']);
                if ((int) $cashSession->branch_id !== (int) $allocation->branch_id
                    || $cashSession->currency_code !== $account->currency_code
                    || $cashSession->status !== 'open') {
                    throw ValidationException::withMessages(['cash_session_id' => 'The cash session must be open and match the allocation branch and currency.']);
                }
            }

            $amount = round((float) $data['amount'], 2);
            $installmentOutstanding = max(0, (float) $installment->amount_due - (float) $installment->amount_paid);
            if ($amount <= 0 || $amount > $installmentOutstanding) {
                throw ValidationException::withMessages(['amount' => 'The payment cannot exceed the installment balance.']);
            }

            $charge = AccountCharge::query()
                ->where('account_id', $account->id)
                ->whereNotIn('status', ['paid', 'void'])
                ->orderByRaw("CASE WHEN charge_type = 'stand_price' THEN 0 ELSE 1 END")
                ->oldest('id')
                ->lockForUpdate()
                ->firstOrFail();
            $chargePaid = (float) PaymentAllocation::query()
                ->where('charge_id', $charge->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                ->sum('amount');
            if ($amount > max(0, (float) $charge->amount - $chargePaid)) {
                throw ValidationException::withMessages(['amount' => 'The payment exceeds the outstanding account balance.']);
            }

            $payment = Payment::create([
                'account_id' => $account->id,
                'branch_id' => $allocation->branch_id,
                'cash_session_id' => $cashSession?->id,
                'amount' => $amount,
                'currency_code' => $account->currency_code,
                'method_id' => $method->id,
                'external_reference' => $data['external_reference'] ?: null,
                'received_at' => $data['received_at'] ?? now(),
                'status' => 'approved',
                'made_by' => $request->user()->id,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);
            $paymentAllocation = PaymentAllocation::create([
                'payment_id' => $payment->id,
                'charge_id' => $charge->id,
                'installment_id' => $installment->id,
                'amount' => $amount,
            ]);

            $installmentPaid = (float) PaymentAllocation::query()
                ->where('installment_id', $installment->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                ->sum('amount');
            $installment->forceFill([
                'amount_paid' => $installmentPaid,
                'status' => $installmentPaid >= (float) $installment->amount_due ? 'paid' : 'partially_paid',
                'paid_at' => $installmentPaid >= (float) $installment->amount_due ? now() : null,
            ])->save();

            $chargePaid += $amount;
            $charge->forceFill([
                'status' => $chargePaid >= (float) $charge->amount ? 'paid' : 'partially_paid',
                'posted_at' => $charge->posted_at ?? now(),
            ])->save();

            if ($cashSession) {
                $received = (float) Payment::query()
                    ->where('cash_session_id', $cashSession->id)
                    ->where('status', 'approved')
                    ->whereHas('method', fn ($query) => $query->where('cash_equivalent', true))
                    ->sum('amount');
                $cashSession->forceFill(['expected_cash' => (float) $cashSession->opening_float + $received])->save();
            }

            $this->auditLogger->record($request, 'payments.created', $payment, null, $payment->getAttributes());
            $this->auditLogger->record($request, 'payment-allocations.created', $paymentAllocation, null, $paymentAllocation->getAttributes());
            $this->issueReceipt($payment, $request);

            return $payment;
        });
    }

    private function issueReceipt(Payment $payment, Request $request): Receipt
    {
        $payment->loadMissing(['account.clientFile.client', 'branch', 'method', 'allocations.charge', 'allocations.installment']);
        $issuedAt = now();
        $sequence = DocumentSequence::firstOrCreate(
            [
                'organization_id' => $request->user()->organization_id,
                'branch_id' => $payment->branch_id,
                'document_type' => 'RECEIPT',
                'period_key' => (string) $issuedAt->year,
            ],
            ['prefix' => 'RCT', 'next_value' => 1, 'padding' => 6],
        );
        $sequence = DocumentSequence::query()->lockForUpdate()->findOrFail($sequence->id);
        $receiptNo = ($sequence->prefix ? $sequence->prefix.'-' : '')
            .str_pad((string) $sequence->next_value, $sequence->padding, '0', STR_PAD_LEFT);
        $sequence->increment('next_value');
        $client = $payment->account->clientFile->client;
        $snapshot = [
            'receipt_no' => $receiptNo,
            'payment_public_id' => $payment->public_id,
            'client' => ['number' => $client->client_no, 'name' => trim("{$client->first_name} {$client->last_name}")],
            'account_no' => $payment->account->account_no,
            'branch' => $payment->branch->name,
            'amount' => $payment->amount,
            'currency' => $payment->currency_code,
            'method' => $payment->method->name,
            'reference' => $payment->external_reference,
            'received_at' => $payment->received_at?->toIso8601String(),
            'issued_at' => $issuedAt->toIso8601String(),
            'allocations' => $payment->allocations->map(fn (PaymentAllocation $allocation) => [
                'charge' => $allocation->charge->charge_type,
                'installment' => $allocation->installment?->sequence_no,
                'amount' => $allocation->amount,
            ])->values()->all(),
        ];
        $encodedSnapshot = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $receipt = Receipt::create([
            'organization_id' => $request->user()->organization_id,
            'payment_id' => $payment->id,
            'receipt_no' => $receiptNo,
            'issued_at' => $issuedAt,
            'content_hash' => hash('sha256', $encodedSnapshot),
            'qr_token_hash' => hash('sha256', Str::random(64)),
            'snapshot_json' => $snapshot,
            'issued_by' => $request->user()->id,
        ]);
        $this->auditLogger->record($request, 'receipts.issued', $receipt, null, $receipt->getAttributes());

        return $receipt;
    }
}
