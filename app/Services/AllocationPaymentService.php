<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\CashSession;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\StandAllocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AllocationPaymentService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly PaymentWorkflowService $paymentWorkflow,
    ) {}

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
                'external_reference' => $method->cash_equivalent ? null : ($data['external_reference'] ?: null),
                'notes' => filled($data['notes'] ?? null) ? trim($data['notes']) : null,
                'received_at' => $data['received_at'] ?? now(),
                'status' => 'pending',
                'made_by' => $request->user()->id,
                'approved_by' => null,
                'approved_at' => null,
            ]);
            $paymentAllocation = PaymentAllocation::create([
                'payment_id' => $payment->id,
                'charge_id' => $charge->id,
                'installment_id' => $installment->id,
                'amount' => $amount,
            ]);

            $this->auditLogger->record($request, 'payments.created', $payment, null, $payment->getAttributes());
            $this->auditLogger->record($request, 'payment-allocations.created', $paymentAllocation, null, $paymentAllocation->getAttributes());
            $this->paymentWorkflow->submit($payment, $request);

            return $payment;
        });
    }
}
