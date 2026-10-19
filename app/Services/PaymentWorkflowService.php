<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\ApprovalRequest;
use App\Models\ApprovalStep;
use App\Models\CashSession;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Role;
use App\Models\User;
use App\Models\WorkflowAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentWorkflowService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly PaymentReceiptService $receipts,
    ) {}

    public function submit(Payment $payment, Request $request): ApprovalRequest
    {
        return DB::transaction(function () use ($payment, $request): ApprovalRequest {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $existing = ApprovalRequest::query()
                ->where('subject_type', Payment::class)
                ->where('subject_id', $payment->id)
                ->where('workflow_type', 'payment_approval')
                ->where('status', 'pending')
                ->first();
            if ($existing) {
                return $existing;
            }

            $organizationId = (int) $payment->account()->with('clientFile.client')->firstOrFail()->clientFile->client->organization_id;
            $approval = ApprovalRequest::query()->create([
                'organization_id' => $organizationId,
                'branch_id' => $payment->branch_id,
                'subject_type' => Payment::class,
                'subject_id' => $payment->id,
                'workflow_type' => 'payment_approval',
                'current_stage' => 1,
                'status' => 'pending',
                'maker_id' => $request->user()->id,
                'submitted_at' => now(),
            ]);
            $payment->forceFill(['approval_request_id' => $approval->id])->saveQuietly();

            $approverRole = Role::query()
                ->where('organization_id', $organizationId)
                ->where('active', true)
                ->whereHas('permissions', fn ($query) => $query->where('name', 'payments.approve'))
                ->orderBy('id')
                ->first();
            $step = ApprovalStep::query()->create([
                'approval_request_id' => $approval->id,
                'sequence_no' => 1,
                'required_role_id' => $approverRole?->id,
                'threshold_min' => $payment->amount,
                'threshold_currency' => $payment->currency_code,
                'status' => 'pending',
            ]);
            WorkflowAction::query()->create([
                'approval_request_id' => $approval->id,
                'approval_step_id' => $step->id,
                'action' => 'submitted',
                'actor_id' => $request->user()->id,
                'note' => 'Client payment submitted for independent approval.',
                'acted_at' => now(),
            ]);
            $this->auditLogger->record($request, 'payments.submitted', $payment, null, [
                'status' => 'pending',
                'approval_request_id' => $approval->id,
                'amount' => (float) $payment->amount,
                'currency_code' => $payment->currency_code,
            ]);

            return $approval;
        });
    }

    public function approve(Payment $payment, User $approver, Request $request): Payment
    {
        return DB::transaction(function () use ($payment, $approver, $request): Payment {
            $payment = Payment::query()->lockForUpdate()->with('allocations')->findOrFail($payment->id);
            if ($payment->status !== 'pending') {
                throw ValidationException::withMessages(['payment' => 'Only a pending payment can be approved.']);
            }
            if ((int) $payment->made_by === (int) $approver->id) {
                throw ValidationException::withMessages(['payment' => 'The person who recorded the payment cannot approve it.']);
            }

            $allocated = 0.0;
            foreach ($payment->allocations as $allocation) {
                $charge = AccountCharge::query()->lockForUpdate()->findOrFail($allocation->charge_id);
                if ((int) $charge->account_id !== (int) $payment->account_id || $charge->status === 'void') {
                    throw ValidationException::withMessages(['payment' => 'One of the proposed allocations is no longer valid.']);
                }
                $alreadyApproved = (float) PaymentAllocation::query()
                    ->where('charge_id', $charge->id)
                    ->where('payment_id', '!=', $payment->id)
                    ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                    ->sum('amount');
                $outstanding = max(0, (float) $charge->amount - $alreadyApproved);
                if ((float) $allocation->amount > $outstanding + 0.005) {
                    throw ValidationException::withMessages([
                        'payment' => "The allocation to {$charge->description} exceeds its current outstanding balance.",
                    ]);
                }
                $allocated += (float) $allocation->amount;
                if ($allocation->installment_id) {
                    $installment = Installment::query()->lockForUpdate()->findOrFail($allocation->installment_id);
                    $alreadyPaid = (float) PaymentAllocation::query()
                        ->where('installment_id', $installment->id)
                        ->where('payment_id', '!=', $payment->id)
                        ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                        ->sum('amount');
                    if ((float) $allocation->amount > max(0, (float) $installment->amount_due - $alreadyPaid) + 0.005) {
                        throw ValidationException::withMessages(['payment' => 'The proposed installment payment exceeds its current balance.']);
                    }
                }
            }
            if ($allocated > (float) $payment->amount + 0.005) {
                throw ValidationException::withMessages(['payment' => 'The proposed allocations exceed the payment amount.']);
            }

            $payment->forceFill([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'lock_version' => $payment->lock_version + 1,
            ])->save();
            $this->refreshBalances($payment);
            $this->receipts->issue($payment, $approver, $request);
            $this->auditLogger->record($request, 'payments.approved', $payment, ['status' => 'pending'], [
                'status' => 'approved',
                'approved_by' => $approver->id,
                'allocated_amount' => $allocated,
            ]);

            return $payment->fresh();
        });
    }

    public function reject(Payment $payment, User $approver, Request $request): Payment
    {
        return DB::transaction(function () use ($payment, $approver, $request): Payment {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status !== 'pending') {
                throw ValidationException::withMessages(['payment' => 'Only a pending payment can be rejected.']);
            }
            if ((int) $payment->made_by === (int) $approver->id) {
                throw ValidationException::withMessages(['payment' => 'The person who recorded the payment cannot reject it.']);
            }
            $payment->forceFill([
                'status' => 'rejected',
                'approved_by' => null,
                'approved_at' => null,
                'lock_version' => $payment->lock_version + 1,
            ])->save();
            $this->auditLogger->record($request, 'payments.rejected', $payment, ['status' => 'pending'], [
                'status' => 'rejected',
                'reviewed_by' => $approver->id,
            ]);

            return $payment->fresh();
        });
    }

    public function refreshBalances(Payment $payment): void
    {
        $payment->loadMissing('allocations');
        foreach ($payment->allocations->pluck('charge_id')->unique() as $chargeId) {
            $charge = AccountCharge::query()->find($chargeId);
            if (! $charge || $charge->status === 'void') {
                continue;
            }
            $approved = (float) PaymentAllocation::query()
                ->where('charge_id', $charge->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                ->sum('amount');
            $charge->forceFill([
                'status' => $approved >= (float) $charge->amount - 0.005
                    ? 'paid'
                    : ($approved > 0 ? 'partially_paid' : 'posted'),
            ])->save();
        }

        foreach ($payment->allocations->pluck('installment_id')->filter()->unique() as $installmentId) {
            $installment = Installment::query()->find($installmentId);
            if (! $installment) {
                continue;
            }
            $paid = (float) PaymentAllocation::query()
                ->where('installment_id', $installment->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                ->sum('amount');
            $installment->forceFill([
                'amount_paid' => $paid,
                'status' => $paid >= (float) $installment->amount_due - 0.005
                    ? 'paid'
                    : ($paid > 0 ? 'partially_paid' : 'scheduled'),
                'paid_at' => $paid >= (float) $installment->amount_due - 0.005 ? now() : null,
            ])->save();
        }

        if ($payment->cash_session_id) {
            $session = CashSession::query()->find($payment->cash_session_id);
            if ($session) {
                $received = (float) Payment::query()
                    ->where('cash_session_id', $session->id)
                    ->where('status', 'approved')
                    ->whereHas('method', fn ($query) => $query->where('cash_equivalent', true))
                    ->sum('amount');
                $session->forceFill(['expected_cash' => (float) $session->opening_float + $received])->save();
            }
        }
    }
}
