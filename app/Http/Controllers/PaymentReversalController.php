<?php

namespace App\Http\Controllers;

use App\Models\ApprovalRequest;
use App\Models\Payment;
use App\Models\PaymentReversal;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentReversalController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function store(Payment $payment, Request $request): RedirectResponse
    {
        abort_unless((int) $payment->account?->clientFile?->client?->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless(app(BranchAccessService::class)->canAccess($request->user(), (int) $payment->branch_id), 404);

        $validated = $request->validate(['reason' => ['required', 'string', 'min:10', 'max:2000']]);

        DB::transaction(function () use ($payment, $request, $validated): void {
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($locked->status !== 'approved') {
                throw ValidationException::withMessages(['reason' => 'Only an approved payment can be submitted for reversal.']);
            }
            if (PaymentReversal::query()->where('payment_id', $locked->id)->exists()) {
                throw ValidationException::withMessages(['reason' => 'A reversal request already exists for this payment.']);
            }

            $approval = ApprovalRequest::create([
                'organization_id' => $request->user()->organization_id,
                'branch_id' => $locked->branch_id,
                'subject_type' => Payment::class,
                'subject_id' => $locked->id,
                'workflow_type' => 'payment_reversal',
                'current_stage' => 1,
                'status' => 'pending',
                'maker_id' => $request->user()->id,
                'submitted_at' => now(),
            ]);

            $reversal = PaymentReversal::create([
                'payment_id' => $locked->id,
                'reason' => $validated['reason'],
                'approval_request_id' => $approval->id,
                'status' => 'pending',
                'requested_by' => $request->user()->id,
            ]);

            $this->auditLogger->record($request, 'payment-reversals.submitted', $reversal, null, [
                'payment_id' => $locked->id,
                'approval_request_id' => $approval->id,
                'status' => 'pending',
                'reason' => $reversal->reason,
            ]);
        });

        return back()->with('success', 'Payment reversal submitted for independent approval.');
    }
}
