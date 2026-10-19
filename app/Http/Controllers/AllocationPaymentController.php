<?php

namespace App\Http\Controllers;

use App\Models\Installment;
use App\Models\StandAllocation;
use App\Services\AllocationPaymentService;
use App\Services\BranchAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AllocationPaymentController extends Controller
{
    public function __construct(
        private readonly BranchAccessService $branchAccess,
        private readonly AllocationPaymentService $payments,
    ) {}

    public function store(Request $request, StandAllocation $standAllocation, Installment $installment): RedirectResponse
    {
        abort_unless($request->user()->can('payments.capture') || $request->user()->can('phase-one.manage'), 403);
        $standAllocation->load('clientFile.client');
        abort_unless((int) $standAllocation->clientFile?->client?->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $standAllocation->branch_id), 404);
        abort_unless((int) $installment->allocation_id === (int) $standAllocation->id, 404);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'method_id' => ['required', 'integer', 'exists:payment_methods,id'],
            'cash_session_id' => ['nullable', 'integer', 'exists:cash_sessions,id'],
            'external_reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:4000'],
            'received_at' => ['nullable', 'date'],
        ]);
        $this->payments->record($standAllocation, $installment, $validated, $request);

        return back()->with('success', 'Payment recorded and sent for independent approval. The receipt will be issued after approval.');
    }
}
