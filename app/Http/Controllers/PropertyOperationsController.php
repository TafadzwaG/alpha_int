<?php

namespace App\Http\Controllers;

use App\Models\CashSession;
use App\Models\Client;
use App\Models\Installment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Services\BranchAccessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PropertyOperationsController extends Controller
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function stand(Request $request, Stand $stand): Response
    {
        $organizationId = (int) $request->user()->organization_id;
        abort_unless($stand->phase()->whereHas('development', fn (Builder $query) => $query->where('organization_id', $organizationId))->exists(), 404);
        $branchIds = $this->branchAccess->branchIds($request->user());
        $stand->load([
            'phase.development:id,name,code,location',
            'standType:id,name,code',
            'allocations' => fn ($query) => $query
                ->when($branchIds !== null, fn ($builder) => $builder->whereIn('branch_id', $branchIds))
                ->with($this->allocationRelations())
                ->latest('allocated_at'),
        ]);

        return Inertia::render('property-operations/stand-show', [
            'stand' => [
                'id' => $stand->id,
                'stand_no' => $stand->stand_no,
                'development' => $stand->phase?->development?->name,
                'development_code' => $stand->phase?->development?->code,
                'phase' => $stand->phase?->name,
                'location' => $stand->phase?->development?->location,
                'type' => $stand->standType?->name,
                'area_sqm' => (float) $stand->area_sqm,
                'list_price' => (float) $stand->list_price,
                'currency' => $stand->currency_code,
                'status' => $stand->physical_status,
                'survey_reference' => $stand->survey_reference,
            ],
            'allocations' => $stand->allocations->map(fn (StandAllocation $allocation) => $this->allocationSummary($allocation))->values(),
            'canManage' => $request->user()->can('phase-one.manage'),
        ]);
    }

    public function client(Request $request, Client $client): Response
    {
        abort_unless((int) $client->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $client->owning_branch_id), 404);
        $branchIds = $this->branchAccess->branchIds($request->user());
        $client->load([
            'owningBranch:id,name,code',
            'files' => fn ($query) => $query
                ->when($branchIds !== null, fn ($builder) => $builder->whereIn('branch_id', $branchIds))
                ->with([
                    'branch:id,name,code',
                    'allocations' => fn ($builder) => $builder->with($this->allocationRelations())->latest('allocated_at'),
                ]),
        ]);
        $allocations = $client->files->flatMap->allocations->map(fn (StandAllocation $allocation) => $this->allocationSummary($allocation))->values();

        return Inertia::render('property-operations/client-show', [
            'client' => [
                'id' => $client->id,
                'public_id' => $client->public_id,
                'client_no' => $client->client_no,
                'name' => trim("{$client->first_name} {$client->middle_names} {$client->last_name}"),
                'phone' => $client->phone_normalized,
                'branch' => $client->owningBranch?->name,
                'branch_code' => $client->owningBranch?->code,
                'status' => $client->status,
                'files' => $client->files->map(fn ($file) => [
                    'id' => $file->id,
                    'file_no' => $file->file_no,
                    'branch' => $file->branch?->name,
                    'opened_at' => $file->opened_at?->toDateString(),
                    'status' => $file->lifecycle_status,
                ])->values(),
            ],
            'summary' => [
                'allocations' => $allocations->count(),
                'purchase_value' => (float) $allocations->sum('price'),
                'paid' => (float) $allocations->sum('paid'),
                'balance' => (float) $allocations->sum('balance'),
                'overdue_installments' => (int) $allocations->sum('overdue_installments'),
            ],
            'allocations' => $allocations,
            'canManage' => $request->user()->can('phase-one.manage'),
        ]);
    }

    public function allocation(Request $request, StandAllocation $standAllocation): Response
    {
        $standAllocation->load($this->allocationRelations());
        abort_unless((int) $standAllocation->clientFile?->client?->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $standAllocation->branch_id), 404);

        $account = $standAllocation->account;
        $installments = $standAllocation->installments->sortBy('sequence_no')->map(fn (Installment $installment) => $this->installmentData($installment))->values();
        $payments = $account?->payments?->sortByDesc('received_at')->map(fn ($payment) => [
            'id' => $payment->id,
            'public_id' => $payment->public_id,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency_code,
            'method' => $payment->method?->name,
            'reference' => $payment->external_reference,
            'received_at' => $payment->received_at?->toIso8601String(),
            'status' => $payment->status,
            'receipt_no' => $payment->receipt?->receipt_no,
            'installment_numbers' => $payment->allocations->pluck('installment.sequence_no')->filter()->values(),
        ])->values() ?? collect();
        $reminders = $standAllocation->installments->flatMap->reminders->sortByDesc('remind_at')->map(fn ($reminder) => [
            'id' => $reminder->id,
            'installment_id' => $reminder->installment_id,
            'installment_no' => $reminder->installment?->sequence_no,
            'channel' => $reminder->channel,
            'remind_at' => $reminder->remind_at?->toIso8601String(),
            'status' => $reminder->status,
            'sent_at' => $reminder->sent_at?->toIso8601String(),
            'notes' => $reminder->notes,
            'created_by' => $reminder->creator?->name,
        ])->values();
        $summary = $this->allocationSummary($standAllocation);
        $timeline = collect([[
            'type' => 'allocation',
            'title' => 'Stand allocated',
            'description' => $standAllocation->stand ? "Stand {$standAllocation->stand->stand_no} allocated to {$summary['client']}" : 'Allocation opened',
            'occurred_at' => $standAllocation->allocated_at?->toIso8601String() ?? $standAllocation->created_at?->toIso8601String(),
        ]])->merge($payments->map(fn (array $payment) => [
            'type' => 'payment',
            'title' => "Payment {$payment['currency']} ".number_format($payment['amount'], 2),
            'description' => trim(($payment['method'] ?? 'Payment').($payment['receipt_no'] ? " · Receipt {$payment['receipt_no']}" : '')),
            'occurred_at' => $payment['received_at'],
        ]))->merge($reminders->map(fn (array $reminder) => [
            'type' => 'reminder',
            'title' => ucfirst($reminder['status'])." {$reminder['channel']} reminder",
            'description' => "Installment #{$reminder['installment_no']}".($reminder['notes'] ? " · {$reminder['notes']}" : ''),
            'occurred_at' => $reminder['sent_at'] ?? $reminder['remind_at'],
        ]))->filter(fn (array $event) => $event['occurred_at'])->sortByDesc('occurred_at')->values();

        return Inertia::render('property-operations/allocation-show', [
            'allocation' => $summary,
            'account' => $account ? ['id' => $account->id, 'account_no' => $account->account_no, 'currency' => $account->currency_code, 'status' => $account->status] : null,
            'installments' => $installments,
            'payments' => $payments,
            'reminders' => $reminders,
            'timeline' => $timeline,
            'paymentMethods' => PaymentMethod::query()->where('active', true)->orderBy('name')->get()->map(fn (PaymentMethod $method) => [
                'id' => (string) $method->id,
                'name' => $method->name,
                'requires_reference' => $method->requires_reference,
                'cash_equivalent' => $method->cash_equivalent,
            ])->values(),
            'cashSessions' => CashSession::query()->where('branch_id', $standAllocation->branch_id)->where('currency_code', $account?->currency_code ?? $standAllocation->currency_code)->where('status', 'open')->with('cashier:id,name')->latest('opened_at')->get()->map(fn (CashSession $session) => [
                'id' => (string) $session->id,
                'label' => "Session #{$session->id} · {$session->cashier?->name}",
            ]),
            'canManage' => $request->user()->can('phase-one.manage'),
        ]);
    }

    private function allocationRelations(): array
    {
        return [
            'clientFile.client:id,organization_id,owning_branch_id,client_no,first_name,middle_names,last_name,phone_normalized,status',
            'branch:id,name,code',
            'stand.phase.development:id,name,code',
            'account.charges.paymentAllocations.payment:id,status',
            'account.payments.method:id,name',
            'account.payments.receipt:id,payment_id,receipt_no',
            'account.payments.allocations.installment:id,sequence_no',
            'installments.paymentAllocations.payment:id,status',
            'installments.reminders.creator:id,name',
            'installments.reminders.installment:id,sequence_no',
        ];
    }

    private function allocationSummary(StandAllocation $allocation): array
    {
        $account = $allocation->account;
        $charges = $account?->charges?->where('status', '!=', 'void') ?? collect();
        $charged = (float) $charges->sum('amount');
        $paid = (float) $charges->flatMap->paymentAllocations->filter(fn (PaymentAllocation $item) => $item->payment?->status === 'approved')->sum('amount');
        $installments = $allocation->installments->map(fn (Installment $installment) => $this->installmentData($installment));
        $nextDue = $installments->whereNotIn('effective_status', ['paid', 'waived'])->sortBy('due_date')->first();

        return [
            'id' => $allocation->id,
            'client_id' => $allocation->clientFile?->client?->id,
            'client_no' => $allocation->clientFile?->client?->client_no,
            'client' => trim("{$allocation->clientFile?->client?->first_name} {$allocation->clientFile?->client?->last_name}"),
            'phone' => $allocation->clientFile?->client?->phone_normalized,
            'stand_id' => $allocation->stand?->id,
            'stand_no' => $allocation->stand?->stand_no,
            'development' => $allocation->stand?->phase?->development?->name,
            'branch' => $allocation->branch?->name,
            'branch_code' => $allocation->branch?->code,
            'category' => $allocation->category,
            'allocated_at' => $allocation->allocated_at?->toDateString(),
            'price' => (float) ($allocation->effective_price ?? $charged),
            'charged' => $charged,
            'paid' => $paid,
            'balance' => max(0, $charged - $paid),
            'currency' => $allocation->currency_code ?? $account?->currency_code ?? 'USD',
            'status' => $allocation->status,
            'account_no' => $account?->account_no,
            'next_due_date' => $nextDue['due_date'] ?? null,
            'next_due_amount' => $nextDue ? max(0, $nextDue['amount_due'] - $nextDue['amount_paid']) : 0,
            'overdue_installments' => $installments->where('effective_status', 'overdue')->count(),
            'installment_count' => $installments->count(),
        ];
    }

    private function installmentData(Installment $installment): array
    {
        $amountPaid = (float) $installment->amount_paid;
        $effectiveStatus = match (true) {
            $installment->status === 'waived' => 'waived',
            $amountPaid >= (float) $installment->amount_due => 'paid',
            $installment->due_date->isBefore(today()) => 'overdue',
            $amountPaid > 0 => 'partially_paid',
            default => 'scheduled',
        };

        return [
            'id' => $installment->id,
            'sequence_no' => $installment->sequence_no,
            'due_date' => $installment->due_date->toDateString(),
            'amount_due' => (float) $installment->amount_due,
            'amount_paid' => $amountPaid,
            'balance' => max(0, (float) $installment->amount_due - $amountPaid),
            'currency' => $installment->currency_code,
            'status' => $installment->status,
            'effective_status' => $effectiveStatus,
            'paid_at' => $installment->paid_at?->toIso8601String(),
            'notes' => $installment->notes,
            'reminder_count' => $installment->reminders->count(),
        ];
    }
}
