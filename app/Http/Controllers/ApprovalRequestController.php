<?php

namespace App\Http\Controllers;

use App\Models\ApprovalRequest;
use App\Models\CashSession;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentReversal;
use App\Models\WorkflowAction;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\PaymentWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalRequestController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly PaymentWorkflowService $paymentWorkflow,
        private readonly BranchAccessService $branchAccess,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless(
            $request->user()->can('expenses.view')
                || $request->user()->can('expenses.approve')
                || $request->user()->can('payments.approve'),
            403,
        );
        $organizationId = $request->user()->organization_id;
        $branchIds = $this->branchAccess->branchIds($request->user());
        $approvals = ApprovalRequest::query()
            ->where('organization_id', $organizationId)
            ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))
            ->whereIn('subject_type', [Expense::class, Payment::class])
            ->with(['subject', 'branch:id,name', 'maker:id,name', 'steps.requiredRole:id,name', 'actions.actor:id,name'])
            ->latest('submitted_at')
            ->get()
            ->map(fn (ApprovalRequest $approval) => [
                'id' => $approval->id,
                'workflow_type' => $approval->workflow_type,
                'status' => $approval->status,
                'current_stage' => $approval->current_stage,
                'submitted_at' => $approval->submitted_at?->toIso8601String(),
                'completed_at' => $approval->completed_at?->toIso8601String(),
                'branch' => $approval->branch?->name,
                'maker' => $approval->maker?->name,
                'is_maker' => (int) $approval->maker_id === (int) $request->user()->id,
                'expense' => $approval->subject instanceof Expense ? [
                    'id' => $approval->subject->id,
                    'expense_no' => $approval->subject->expense_no,
                    'payee' => $approval->subject->payee,
                    'purpose' => $approval->subject->purpose,
                    'amount' => (float) $approval->subject->total_amount,
                    'currency_code' => $approval->subject->currency_code,
                    'incurred_at' => $approval->subject->incurred_at?->toIso8601String(),
                ] : null,
                'payment' => $approval->subject instanceof Payment && $approval->workflow_type === 'payment_approval' ? (function (Payment $payment): array {
                    $payment->loadMissing(['account.clientFile.client', 'method', 'allocations.charge']);
                    $client = $payment->account?->clientFile?->client;
                    $allocations = $payment->allocations->map(fn (PaymentAllocation $allocation): array => [
                        'id' => $allocation->id,
                        'charge' => $allocation->charge?->description ?? $allocation->charge?->charge_type ?? 'Account charge',
                        'amount' => (float) $allocation->amount,
                    ])->values();
                    $allocated = (float) $allocations->sum('amount');

                    return [
                        'id' => $payment->id,
                        'reference' => $payment->external_reference ?: 'Payment #'.$payment->id,
                        'client' => $client ? trim("{$client->first_name} {$client->last_name}") : 'Unknown client',
                        'account' => $payment->account?->account_no,
                        'amount' => (float) $payment->amount,
                        'currency_code' => $payment->currency_code,
                        'method' => $payment->method?->name,
                        'received_at' => $payment->received_at?->toIso8601String(),
                        'notes' => $payment->notes,
                        'status' => $payment->status,
                        'allocations' => $allocations,
                        'allocated_amount' => $allocated,
                        'unallocated_amount' => max(0, (float) $payment->amount - $allocated),
                    ];
                })($approval->subject) : null,
                'payment_reversal' => $approval->subject instanceof Payment ? (function (Payment $payment) use ($approval): ?array {
                    $reversal = PaymentReversal::query()->where('approval_request_id', $approval->id)->first();
                    if (! $reversal) {
                        return null;
                    }

                    return [
                        'payment_id' => $payment->id,
                        'reference' => $payment->external_reference ?: 'Payment #'.$payment->id,
                        'amount' => (float) $payment->amount,
                        'currency_code' => $payment->currency_code,
                        'reason' => $reversal->reason,
                    ];
                })($approval->subject) : null,
                'required_role' => $approval->steps->first()?->requiredRole?->name,
                'last_action' => $approval->actions->first() ? [
                    'action' => $approval->actions->first()->action,
                    'actor' => $approval->actions->first()->actor?->name,
                    'note' => $approval->actions->first()->note,
                    'acted_at' => $approval->actions->first()->acted_at?->toIso8601String(),
                ] : null,
            ]);

        return Inertia::render('approvals/index', [
            'approvals' => $approvals,
            'canApproveExpenses' => $request->user()->can('expenses.approve'),
            'canApprovePayments' => $request->user()->can('payments.approve'),
            'summary' => [
                'pending' => $approvals->where('status', 'pending')->count(),
                'pendingValue' => $approvals->where('status', 'pending')->sum(fn (array $approval) => $approval['expense']['amount'] ?? $approval['payment']['amount'] ?? $approval['payment_reversal']['amount'] ?? 0),
                'approved' => $approvals->where('status', 'approved')->count(),
                'rejected' => $approvals->where('status', 'rejected')->count(),
            ],
        ]);
    }

    public function decide(ApprovalRequest $approvalRequest, Request $request): RedirectResponse
    {
        abort_unless((int) $approvalRequest->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $approvalRequest->branch_id), 404);
        abort_unless(in_array($approvalRequest->subject_type, [Expense::class, Payment::class], true), 422);
        $paymentWorkflow = in_array($approvalRequest->workflow_type, ['payment_approval', 'payment_reversal'], true);
        abort_unless(
            $paymentWorkflow
                ? $request->user()->can('payments.approve')
                : $request->user()->can('expenses.approve'),
            403,
        );

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($approvalRequest, $request, $validated) {
            $approval = ApprovalRequest::query()->lockForUpdate()->findOrFail($approvalRequest->id);
            abort_unless($approval->status === 'pending', 422, 'This approval request has already been completed.');
            if (in_array($approval->workflow_type, ['payment_approval', 'payment_reversal'], true)) {
                abort_if((int) $approval->maker_id === (int) $request->user()->id, 422, 'Payments require an independent approver.');
            }

            $step = $approval->steps()->where('status', 'pending')->first();
            $approved = $validated['action'] === 'approve';
            $now = now();

            if ($step) {
                $step->forceFill([
                    'status' => $approved ? 'approved' : 'rejected',
                    'assigned_user_id' => $request->user()->id,
                    'completed_at' => $now,
                    'lock_version' => $step->lock_version + 1,
                ])->save();
            }

            $approval->forceFill([
                'status' => $approved ? 'approved' : 'rejected',
                'completed_at' => $now,
                'lock_version' => $approval->lock_version + 1,
            ])->save();

            $subject = $approval->subject()->firstOrFail();
            if ($approval->workflow_type === 'payment_reversal') {
                /** @var Payment $subject */
                $reversal = PaymentReversal::query()->where('approval_request_id', $approval->id)->lockForUpdate()->firstOrFail();
                $reversal->forceFill([
                    'status' => $approved ? 'completed' : 'rejected',
                    'reversed_at' => $approved ? $now : null,
                    'reversed_by' => $approved ? $request->user()->id : null,
                    'reversal_receipt_no' => $approved ? 'REV-'.str_pad((string) $subject->id, 8, '0', STR_PAD_LEFT).'-'.$now->format('YmdHis') : null,
                ])->save();
                if ($approved) {
                    $subject->forceFill(['status' => 'reversed', 'lock_version' => $subject->lock_version + 1])->save();
                    $this->refreshPaymentBalances($subject);
                }
            } elseif ($approval->workflow_type === 'payment_approval') {
                /** @var Payment $subject */
                if ($approved) {
                    $this->paymentWorkflow->approve($subject, $request->user(), $request);
                } else {
                    $this->paymentWorkflow->reject($subject, $request->user(), $request);
                }
            } else {
                /** @var Expense $subject */
                $subject->forceFill([
                    'status' => $approved ? 'approved' : 'rejected',
                    'approved_by' => $approved ? $request->user()->id : null,
                    'approved_at' => $approved ? $now : null,
                    'lock_version' => $subject->lock_version + 1,
                ])->save();
            }

            WorkflowAction::create([
                'approval_request_id' => $approval->id,
                'approval_step_id' => $step?->id,
                'action' => $approved ? 'approved' : 'rejected',
                'actor_id' => $request->user()->id,
                'note' => $validated['note'] ?? null,
                'acted_at' => $now,
            ]);

            $this->auditLogger->record(
                $request,
                match ($approval->workflow_type) {
                    'payment_reversal' => 'payment-reversals.',
                    'payment_approval' => 'payment-approvals.',
                    default => 'expense-approvals.',
                }.($approved ? 'approved' : 'rejected'),
                $approval,
                ['status' => 'pending'],
                ['status' => $approval->status, 'subject_id' => $subject->id, 'workflow_type' => $approval->workflow_type],
            );
        });

        return back()->with('success', 'Approval decision recorded successfully.');
    }

    private function refreshPaymentBalances(Payment $payment): void
    {
        $payment->loadMissing('allocations.charge');
        foreach ($payment->allocations->pluck('charge')->filter()->unique('id') as $charge) {
            if ($charge->status === 'void') {
                continue;
            }
            $allocated = (float) PaymentAllocation::query()
                ->where('charge_id', $charge->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                ->sum('amount');
            $charge->forceFill(['status' => $allocated >= (float) $charge->amount ? 'paid' : ($allocated > 0 ? 'partially_paid' : 'posted')])->save();
        }

        if ($payment->cash_session_id) {
            $session = CashSession::query()->find($payment->cash_session_id);
            if ($session) {
                $received = Payment::query()->where('cash_session_id', $session->id)->where('status', 'approved')
                    ->whereHas('method', fn ($query) => $query->where('cash_equivalent', true))->sum('amount');
                $session->forceFill(['expected_cash' => (float) $session->opening_float + (float) $received])->save();
            }
        }
    }
}
