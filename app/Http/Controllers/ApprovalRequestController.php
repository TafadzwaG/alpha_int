<?php

namespace App\Http\Controllers;

use App\Models\ApprovalRequest;
use App\Models\Expense;
use App\Models\WorkflowAction;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalRequestController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $approvals = ApprovalRequest::query()
            ->where('organization_id', $organizationId)
            ->where('subject_type', Expense::class)
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
                'expense' => $approval->subject instanceof Expense ? [
                    'id' => $approval->subject->id,
                    'expense_no' => $approval->subject->expense_no,
                    'payee' => $approval->subject->payee,
                    'purpose' => $approval->subject->purpose,
                    'amount' => (float) $approval->subject->total_amount,
                    'currency_code' => $approval->subject->currency_code,
                    'incurred_at' => $approval->subject->incurred_at?->toIso8601String(),
                ] : null,
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
            'summary' => [
                'pending' => $approvals->where('status', 'pending')->count(),
                'pendingValue' => $approvals->where('status', 'pending')->sum('expense.amount'),
                'approved' => $approvals->where('status', 'approved')->count(),
                'rejected' => $approvals->where('status', 'rejected')->count(),
            ],
        ]);
    }

    public function decide(ApprovalRequest $approvalRequest, Request $request): RedirectResponse
    {
        abort_unless((int) $approvalRequest->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($approvalRequest->subject_type === Expense::class, 422);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($approvalRequest, $request, $validated) {
            $approval = ApprovalRequest::query()->lockForUpdate()->findOrFail($approvalRequest->id);
            abort_unless($approval->status === 'pending', 422, 'This approval request has already been completed.');

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

            /** @var Expense $expense */
            $expense = $approval->subject()->firstOrFail();
            $expense->forceFill([
                'status' => $approved ? 'approved' : 'rejected',
                'approved_by' => $approved ? $request->user()->id : null,
                'approved_at' => $approved ? $now : null,
                'lock_version' => $expense->lock_version + 1,
            ])->save();

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
                $approved ? 'expense-approvals.approved' : 'expense-approvals.rejected',
                $approval,
                ['status' => 'pending'],
                ['status' => $approval->status, 'expense_id' => $expense->id],
            );
        });

        return back()->with('success', 'Approval decision recorded successfully.');
    }
}
