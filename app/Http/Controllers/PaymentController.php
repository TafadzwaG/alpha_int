<?php

namespace App\Http\Controllers;

use App\Models\AccountCharge;
use App\Models\CashSession;
use App\Models\ClientAccount;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\PaymentWorkflowService;
use App\Services\PhaseOneResourceRegistry;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PhaseOneResourceRegistry $registry,
        private readonly BranchAccessService $branchAccess,
        private readonly PaymentWorkflowService $workflow,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): Response
    {
        $page = $this->registry->page('payments', $request);
        $organizationId = (int) $request->user()->organization_id;
        $branchIds = $this->branchAccess->branchIds($request->user());
        $systemTimezone = $request->user()->organization?->timezone ?: config('app.timezone');

        $accounts = ClientAccount::query()
            ->where('status', 'open')
            ->whereHas('clientFile.client', fn (Builder $query) => $query->where('organization_id', $organizationId))
            ->when($branchIds !== null, fn (Builder $query) => $query->whereHas('clientFile', fn (Builder $file) => $file->whereIn('branch_id', $branchIds)))
            ->with([
                'clientFile.client:id,client_no,first_name,last_name,phone_normalized',
                'clientFile.branch:id,name,timezone',
                'allocation.stand.phase.development:id,name',
                'charges' => fn ($query) => $query
                    ->whereNot('status', 'void')
                    ->withSum([
                        'paymentAllocations as approved_allocated' => fn ($allocations) => $allocations
                            ->whereHas('payment', fn ($payments) => $payments->where('status', 'approved')),
                    ], 'amount')
                    ->orderBy('due_date')
                    ->orderBy('id'),
            ])
            ->orderBy('account_no')
            ->get()
            ->map(function (ClientAccount $account) use ($systemTimezone): array {
                $charges = $account->charges->map(function (AccountCharge $charge): array {
                    $outstanding = max(0, round((float) $charge->amount - (float) ($charge->approved_allocated ?? 0), 2));

                    return [
                        'id' => (string) $charge->id,
                        'description' => $charge->description ?: str($charge->charge_type)->headline()->toString(),
                        'type' => str($charge->charge_type)->headline()->toString(),
                        'due_date' => $charge->due_date?->toDateString(),
                        'original_amount' => (float) $charge->amount,
                        'outstanding' => $outstanding,
                    ];
                })->filter(fn (array $charge) => $charge['outstanding'] > 0.005)->values();
                $client = $account->clientFile->client;

                return [
                    'id' => (string) $account->id,
                    'account_no' => $account->account_no,
                    'client' => trim("{$client->first_name} {$client->last_name}"),
                    'client_no' => $client->client_no,
                    'phone' => $client->phone_normalized,
                    'branch_id' => (string) $account->clientFile->branch_id,
                    'branch' => $account->clientFile->branch?->name,
                    'timezone' => $account->clientFile->branch?->timezone ?: $systemTimezone,
                    'currency' => $account->currency_code,
                    'stand' => $account->allocation?->stand?->stand_no,
                    'development' => $account->allocation?->stand?->phase?->development?->name,
                    'outstanding' => round((float) $charges->sum('outstanding'), 2),
                    'charges' => $charges,
                ];
            })->values();

        return Inertia::render('payments/index', [
            'canCapture' => $request->user()->can('payments.capture') || $request->user()->can('phase-one.manage'),
            'records' => $page['records'],
            'paymentStats' => $page['paymentStats'],
            'filters' => $page['filters'],
            'branches' => $page['options']['branches'],
            'currencies' => $page['options']['currencies'],
            'accounts' => $accounts,
            'systemTimezone' => $systemTimezone,
            'methods' => PaymentMethod::query()->where('active', true)->orderBy('name')->get()
                ->map(fn (PaymentMethod $method): array => [
                    'id' => (string) $method->id,
                    'name' => $method->name,
                    'requires_reference' => $method->requires_reference,
                    'cash_equivalent' => $method->cash_equivalent,
                ]),
            'cashSessions' => CashSession::query()
                ->where('status', 'open')
                ->whereHas('branch', fn (Builder $query) => $query->where('organization_id', $organizationId))
                ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('branch_id', $branchIds))
                ->with(['branch:id,name', 'cashier:id,name'])
                ->latest('opened_at')
                ->get()
                ->map(fn (CashSession $session): array => [
                    'id' => (string) $session->id,
                    'branch_id' => (string) $session->branch_id,
                    'currency' => $session->currency_code,
                    'label' => "{$session->branch?->name} - {$session->cashier?->name} ({$session->currency_code})",
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('payments.capture') || $request->user()->can('phase-one.manage'), 403);

        $validated = $request->validate([
            'account_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999'],
            'method_id' => ['required', Rule::exists('payment_methods', 'id')->where('active', true)],
            'cash_session_id' => ['nullable', 'integer'],
            'external_reference' => ['nullable', 'string', 'max:120'],
            'received_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:4000'],
            'allocations' => ['nullable', 'array', 'max:100'],
            'allocations.*.charge_id' => ['required', 'integer', 'distinct'],
            'allocations.*.amount' => ['required', 'numeric', 'min:0'],
        ]);

        $organizationId = (int) $request->user()->organization_id;
        $account = ClientAccount::query()
            ->whereKey($validated['account_id'])
            ->where('status', 'open')
            ->whereHas('clientFile.client', fn (Builder $query) => $query->where('organization_id', $organizationId))
            ->with(['clientFile.client', 'clientFile.branch'])
            ->firstOrFail();
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $account->clientFile->branch_id), 404);

        $timezone = $account->clientFile->branch?->timezone ?: $request->user()->organization?->timezone ?: config('app.timezone');
        $receivedAt = CarbonImmutable::parse($validated['received_at'], $timezone);
        if ($receivedAt->isAfter(CarbonImmutable::now($timezone))) {
            throw ValidationException::withMessages([
                'received_at' => "The received time cannot be later than the current time in {$timezone}.",
            ]);
        }

        $method = PaymentMethod::query()->whereKey($validated['method_id'])->where('active', true)->firstOrFail();
        if ($method->requires_reference && blank($validated['external_reference'] ?? null)) {
            throw ValidationException::withMessages(['external_reference' => 'Enter the bank, card or mobile transaction reference.']);
        }
        $externalReference = $method->cash_equivalent ? null : ($validated['external_reference'] ?? null);

        $cashSession = null;
        if ($method->cash_equivalent) {
            if (blank($validated['cash_session_id'] ?? null)) {
                throw ValidationException::withMessages(['cash_session_id' => 'Select the open till receiving this cash payment.']);
            }
            $cashSession = CashSession::query()->whereKey($validated['cash_session_id'])->where('status', 'open')->first();
            if (! $cashSession
                || (int) $cashSession->branch_id !== (int) $account->clientFile->branch_id
                || $cashSession->currency_code !== $account->currency_code) {
                throw ValidationException::withMessages(['cash_session_id' => 'Choose an open till for this branch and currency.']);
            }
        }

        $duplicate = filled($externalReference)
            && Payment::query()
                ->where('branch_id', $account->clientFile->branch_id)
                ->where('method_id', $method->id)
                ->where('external_reference', $externalReference)
                ->exists();
        if ($duplicate) {
            throw ValidationException::withMessages(['external_reference' => 'This transaction reference has already been recorded for the selected payment method.']);
        }

        $allocationRows = collect($validated['allocations'] ?? [])->filter(fn (array $row) => (float) $row['amount'] > 0);
        if ((float) $allocationRows->sum('amount') > (float) $validated['amount'] + 0.005) {
            throw ValidationException::withMessages(['allocations' => 'Allocated amounts cannot exceed the amount received.']);
        }
        $chargeIds = $allocationRows->pluck('charge_id')->map(fn ($id) => (int) $id)->all();
        $charges = AccountCharge::query()
            ->where('account_id', $account->id)
            ->whereNot('status', 'void')
            ->whereIn('id', $chargeIds)
            ->get()
            ->keyBy('id');
        if ($charges->count() !== count($chargeIds)) {
            throw ValidationException::withMessages(['allocations' => 'One of the selected charges does not belong to this client account.']);
        }
        foreach ($allocationRows as $row) {
            $charge = $charges->get((int) $row['charge_id']);
            $approved = (float) PaymentAllocation::query()
                ->where('charge_id', $charge->id)
                ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))
                ->sum('amount');
            if ((float) $row['amount'] > max(0, (float) $charge->amount - $approved) + 0.005) {
                throw ValidationException::withMessages(['allocations' => "The amount applied to {$charge->description} exceeds its outstanding balance."]);
            }
        }

        $payment = DB::transaction(function () use ($request, $validated, $account, $method, $cashSession, $allocationRows, $externalReference, $receivedAt): Payment {
            $payment = Payment::query()->create([
                'account_id' => $account->id,
                'branch_id' => $account->clientFile->branch_id,
                'cash_session_id' => $cashSession?->id,
                'amount' => $validated['amount'],
                'currency_code' => $account->currency_code,
                'method_id' => $method->id,
                'external_reference' => $externalReference,
                'received_at' => $receivedAt->utc(),
                'status' => 'pending',
                'notes' => filled($validated['notes'] ?? null) ? trim($validated['notes']) : null,
                'made_by' => $request->user()->id,
                'approved_by' => null,
                'approved_at' => null,
                'lock_version' => 0,
            ]);
            foreach ($allocationRows as $row) {
                PaymentAllocation::query()->create([
                    'payment_id' => $payment->id,
                    'charge_id' => $row['charge_id'],
                    'amount' => $row['amount'],
                ]);
            }
            $this->auditLogger->record($request, 'payments.created', $payment, null, [
                'status' => 'pending',
                'amount' => (float) $payment->amount,
                'currency_code' => $payment->currency_code,
                'allocation_count' => $allocationRows->count(),
            ]);
            $this->workflow->submit($payment, $request);

            return $payment;
        });

        return to_route('administration.payments.show', $payment)
            ->with('success', 'Payment recorded and sent to another authorised user for approval.');
    }
}
