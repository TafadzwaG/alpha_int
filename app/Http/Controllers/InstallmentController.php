<?php

namespace App\Http\Controllers;

use App\Models\AccountCharge;
use App\Models\Installment;
use App\Models\InstallmentReminder;
use App\Models\PaymentAllocation;
use App\Models\StandAllocation;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InstallmentController extends Controller
{
    public function __construct(
        private readonly BranchAccessService $branchAccess,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function store(Request $request, StandAllocation $standAllocation): RedirectResponse
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);
        $standAllocation->load(['clientFile.client', 'account.charges', 'stand']);
        abort_unless((int) $standAllocation->clientFile?->client?->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $standAllocation->branch_id), 404);

        $validated = $request->validate([
            'first_due_date' => ['required', 'date'],
            'installment_count' => ['required', 'integer', 'min:1', 'max:120'],
            'frequency_months' => ['required', 'integer', 'min:1', 'max:12'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        if ($standAllocation->installments()->exists()) {
            throw ValidationException::withMessages(['installment_count' => 'An installment schedule already exists for this allocation.']);
        }

        DB::transaction(function () use ($standAllocation, $validated, $request): void {
            $account = $standAllocation->account;
            if (! $account) {
                throw ValidationException::withMessages(['installment_count' => 'Create the client account before generating a schedule.']);
            }

            $charge = $account->charges->firstWhere('charge_type', 'stand_price');
            if (! $charge) {
                $charge = AccountCharge::create([
                    'account_id' => $account->id,
                    'charge_type' => 'stand_price',
                    'description' => 'Stand '.$standAllocation->stand?->stand_no.' purchase price',
                    'amount' => $standAllocation->effective_price,
                    'currency_code' => $account->currency_code,
                    'due_date' => $validated['first_due_date'],
                    'status' => 'posted',
                    'posted_at' => now(),
                    'created_by' => $request->user()->id,
                ]);
            }
            $paid = (float) PaymentAllocation::query()
                ->where('charge_id', $charge->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                ->sum('amount');
            $outstandingCents = (int) round(max(0, (float) $charge->amount - $paid) * 100);
            if ($outstandingCents <= 0) {
                throw ValidationException::withMessages(['installment_count' => 'This allocation has no outstanding balance to schedule.']);
            }

            $count = (int) $validated['installment_count'];
            $baseCents = intdiv($outstandingCents, $count);
            $remainder = $outstandingCents % $count;
            $firstDueDate = Carbon::parse($validated['first_due_date'])->startOfDay();
            foreach (range(1, $count) as $sequence) {
                $amountCents = $baseCents + ($sequence <= $remainder ? 1 : 0);
                $dueDate = $firstDueDate->copy()->addMonthsNoOverflow(($sequence - 1) * (int) $validated['frequency_months']);
                $installment = Installment::create([
                    'allocation_id' => $standAllocation->id,
                    'sequence_no' => $sequence,
                    'due_date' => $dueDate,
                    'amount_due' => $amountCents / 100,
                    'amount_paid' => 0,
                    'currency_code' => $account->currency_code,
                    'status' => 'scheduled',
                    'notes' => $validated['notes'] ?: null,
                ]);
                InstallmentReminder::create([
                    'installment_id' => $installment->id,
                    'channel' => 'in_app',
                    'remind_at' => $dueDate->copy()->subDays(7),
                    'status' => 'scheduled',
                    'notes' => 'Automatic installment reminder.',
                    'created_by' => $request->user()->id,
                ]);
            }
            $this->auditLogger->record($request, 'installments.schedule-created', $standAllocation, null, [
                'installment_count' => $count,
                'first_due_date' => $validated['first_due_date'],
                'frequency_months' => $validated['frequency_months'],
                'scheduled_amount' => $outstandingCents / 100,
            ]);
        });

        return back()->with('success', 'Installment schedule created successfully.');
    }
}
