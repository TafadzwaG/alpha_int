<?php

namespace App\Http\Controllers;

use App\Models\AccountCharge;
use App\Models\ApprovalRequest;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PettyCashEntry;
use App\Models\Stand;
use App\Models\StandAllocation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $canViewExpenses = $request->user()->can('expenses.view');
        $chargeScope = fn (Builder $query) => $query->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId));
        $paymentScope = fn (Builder $query) => $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId));
        $expenseScope = fn (Builder $query) => $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId));

        $totalCharges = (float) AccountCharge::query()->tap($chargeScope)->whereNot('status', 'void')->sum('amount');
        $totalAllocated = (float) PaymentAllocation::query()
            ->whereHas('charge.account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->sum('amount');
        $totalCollections = (float) Payment::query()->tap($paymentScope)->where('status', 'approved')->sum('amount');
        $approvedExpenses = (float) Expense::query()->tap($expenseScope)->whereIn('status', ['approved', 'paid'])->sum('total_amount');

        $pettyCashBalance = PettyCashEntry::query()
            ->tap($expenseScope)
            ->get(['entry_type', 'amount'])
            ->sum(fn (PettyCashEntry $entry) => in_array($entry->entry_type, ['replenishment', 'refund', 'adjustment'], true)
                ? (float) $entry->amount
                : -1 * (float) $entry->amount);

        $inventory = Stand::query()
            ->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->selectRaw('physical_status, count(*) as total')
            ->groupBy('physical_status')
            ->pluck('total', 'physical_status');

        $financialTrend = collect(range(5, 0))->map(function (int $offset) use ($chargeScope, $paymentScope, $expenseScope) {
            $month = now()->startOfMonth()->subMonths($offset);
            $range = [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()];

            return [
                'month' => $month->format('M'),
                'label' => $month->format('F Y'),
                'charges' => (float) AccountCharge::query()->tap($chargeScope)->whereNot('status', 'void')->whereBetween('posted_at', $range)->sum('amount'),
                'collections' => (float) Payment::query()->tap($paymentScope)->where('status', 'approved')->whereBetween('received_at', $range)->sum('amount'),
                'expenses' => (float) Expense::query()->tap($expenseScope)->whereIn('status', ['approved', 'paid'])->whereBetween('incurred_at', $range)->sum('total_amount'),
            ];
        });

        return Inertia::render('dashboard', [
            'metrics' => [
                'portfolioValue' => (float) Stand::query()->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))->whereNot('physical_status', 'withdrawn')->sum('list_price'),
                'activeClients' => Client::query()->where('organization_id', $organizationId)->where('status', 'active')->count(),
                'allocatedStands' => StandAllocation::query()->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))->where('status', 'allocated')->count(),
                'availableStands' => (int) ($inventory['available'] ?? 0),
                'totalCharges' => $totalCharges,
                'collections' => $totalCollections,
                'outstanding' => max(0, $totalCharges - $totalAllocated),
                'approvedExpenses' => $approvedExpenses,
                'pettyCashBalance' => $pettyCashBalance,
                'pendingApprovals' => ApprovalRequest::query()->where('organization_id', $organizationId)->where('status', 'pending')->count(),
            ],
            'financialTrend' => $financialTrend,
            'inventory' => collect(['available', 'allocated', 'reserved', 'planned', 'withdrawn'])->map(fn (string $status) => [
                'status' => $status,
                'total' => (int) ($inventory[$status] ?? 0),
            ]),
            'recentPayments' => Payment::query()
                ->tap($paymentScope)
                ->with(['account.clientFile.client:id,first_name,last_name', 'method:id,name', 'branch:id,name'])
                ->latest('received_at')
                ->limit(6)
                ->get()
                ->map(fn (Payment $payment) => [
                    'id' => $payment->id,
                    'client' => trim("{$payment->account?->clientFile?->client?->first_name} {$payment->account?->clientFile?->client?->last_name}"),
                    'method' => $payment->method?->name,
                    'branch' => $payment->branch?->name,
                    'amount' => (float) $payment->amount,
                    'currency' => $payment->currency_code,
                    'status' => $payment->status,
                    'received_at' => $payment->received_at?->toIso8601String(),
                ]),
            'approvalQueue' => $canViewExpenses
                ? ApprovalRequest::query()
                    ->where('organization_id', $organizationId)
                    ->where('status', 'pending')
                    ->with(['subject', 'branch:id,name', 'maker:id,name'])
                    ->latest('submitted_at')
                    ->limit(5)
                    ->get()
                    ->filter(fn (ApprovalRequest $approval) => $approval->subject instanceof Expense)
                    ->map(fn (ApprovalRequest $approval) => [
                        'id' => $approval->id,
                        'expense_no' => $approval->subject->expense_no,
                        'payee' => $approval->subject->payee,
                        'amount' => (float) $approval->subject->total_amount,
                        'currency' => $approval->subject->currency_code,
                        'branch' => $approval->branch?->name,
                        'submitted_at' => $approval->submitted_at?->toIso8601String(),
                    ])->values()
                : [],
            'canViewReports' => $request->user()->can('reports.view'),
            'canViewExpenses' => $canViewExpenses,
            'currency' => 'USD',
        ]);
    }
}
