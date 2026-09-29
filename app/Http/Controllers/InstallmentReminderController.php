<?php

namespace App\Http\Controllers;

use App\Models\Installment;
use App\Models\InstallmentReminder;
use App\Models\StandAllocation;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InstallmentReminderController extends Controller
{
    public function __construct(
        private readonly BranchAccessService $branchAccess,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function store(Request $request, StandAllocation $standAllocation, Installment $installment): RedirectResponse
    {
        $this->authorizeWrite($request, $standAllocation, $installment);
        $validated = $request->validate([
            'channel' => ['required', 'in:in_app,email,sms,phone,whatsapp'],
            'remind_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $reminder = InstallmentReminder::create([
            ...$validated,
            'installment_id' => $installment->id,
            'status' => 'scheduled',
            'created_by' => $request->user()->id,
        ]);
        $this->auditLogger->record($request, 'installment-reminders.created', $reminder, null, $reminder->getAttributes());

        return back()->with('success', 'Reminder scheduled successfully.');
    }

    public function markSent(Request $request, StandAllocation $standAllocation, Installment $installment, InstallmentReminder $installmentReminder): RedirectResponse
    {
        $this->authorizeWrite($request, $standAllocation, $installment);
        abort_unless((int) $installmentReminder->installment_id === (int) $installment->id, 404);
        $before = $installmentReminder->getAttributes();
        $installmentReminder->forceFill(['status' => 'sent', 'sent_at' => now()])->save();
        $this->auditLogger->record($request, 'installment-reminders.sent', $installmentReminder, $before, $installmentReminder->getAttributes());

        return back()->with('success', 'Reminder marked as sent.');
    }

    private function authorizeWrite(Request $request, StandAllocation $allocation, Installment $installment): void
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);
        $allocation->load('clientFile.client');
        abort_unless((int) $allocation->clientFile?->client?->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $allocation->branch_id), 404);
        abort_unless((int) $installment->allocation_id === (int) $allocation->id, 404);
    }
}
