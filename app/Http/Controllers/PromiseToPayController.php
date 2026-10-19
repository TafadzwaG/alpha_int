<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PromiseToPay;
use App\Services\AuditLogger;
use App\Services\CallCentreService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PromiseToPayController extends Controller
{
    public function __construct(
        private readonly CallCentreService $callCentre,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function update(Request $request, PromiseToPay $promiseToPay): RedirectResponse
    {
        abort_unless($request->user()->can('call-centre.tasks.manage'), 403);
        $promiseToPay->load('client');
        $this->callCentre->authorizeClient($request->user(), $promiseToPay->client);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'fulfilled', 'broken', 'cancelled'])],
            'payment_id' => ['nullable', Rule::exists('payments', 'id')->where('branch_id', $promiseToPay->branch_id)],
        ]);
        if (! empty($validated['payment_id'])) {
            abort_unless(Payment::query()->whereKey($validated['payment_id'])->where('status', 'approved')->exists(), 422, 'Only an approved payment can fulfil a promise.');
        }
        $before = $promiseToPay->getAttributes();
        $promiseToPay->forceFill([
            'status' => $validated['status'],
            'payment_id' => $validated['payment_id'] ?? $promiseToPay->payment_id,
            'fulfilled_at' => $validated['status'] === 'fulfilled' ? now() : null,
        ])->save();
        $this->auditLogger->record($request, 'call-centre.promise-updated', $promiseToPay, $before, $promiseToPay->getAttributes());

        return back()->with('success', 'Promise-to-pay status updated.');
    }
}
