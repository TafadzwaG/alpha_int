<?php

namespace App\Http\Controllers;

use App\Models\AccountCharge;
use App\Models\ApprovalRequest;
use App\Models\Branch;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PettyCashEntry;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\UserBranchAccess;
use App\Services\ZimRateService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly ZimRateService $zimRateService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $organizationId = (int) $user->organization_id;
        $baseCurrency = $user->organization?->base_currency_code ?? 'USD';
        $canViewExpenses = $user->can('expenses.view');
        $canViewAllBranches = $user->can('phase-one.manage');
        $accessibleBranchIds = $canViewAllBranches
            ? null
            : UserBranchAccess::query()
                ->where('user_id', $user->id)
                ->where('active', true)
                ->where(fn (Builder $query) => $query->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
                ->where(fn (Builder $query) => $query->whereNull('valid_to')->orWhere('valid_to', '>=', now()))
                ->pluck('branch_id');

        $branchOptions = Branch::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->when($accessibleBranchIds !== null, fn (Builder $query) => $query->whereIn('id', $accessibleBranchIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name']);
        $requestedBranch = (string) $request->query('branch', 'all');
        $selectedBranch = ctype_digit($requestedBranch)
            ? $branchOptions->firstWhere('id', (int) $requestedBranch)
            : null;
        $branchIds = $selectedBranch
            ? collect([$selectedBranch->id])
            : ($canViewAllBranches ? null : $accessibleBranchIds);
        $scopeLabel = $selectedBranch?->name
            ?? ($canViewAllBranches
                ? 'All branches'
                : ($branchOptions->count() === 1 ? $branchOptions->first()->name : 'All assigned branches'));

        $chargeScope = fn (Builder $query) => $query->whereHas('account.clientFile', fn (Builder $builder) => $builder
            ->whereHas('client', fn (Builder $client) => $client->where('organization_id', $organizationId))
            ->when($branchIds !== null, fn (Builder $file) => $file->whereIn('branch_id', $branchIds)));
        $paymentScope = fn (Builder $query) => $query
            ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->when($branchIds !== null, fn (Builder $builder) => $builder->whereIn('branch_id', $branchIds));
        $expenseScope = fn (Builder $query) => $query
            ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->when($branchIds !== null, fn (Builder $builder) => $builder->whereIn('branch_id', $branchIds));

        $totalCharges = (float) AccountCharge::query()->tap($chargeScope)->whereNot('status', 'void')->sum('amount');
        $totalAllocated = (float) PaymentAllocation::query()
            ->whereHas('charge.account.clientFile', fn (Builder $builder) => $builder
                ->whereHas('client', fn (Builder $client) => $client->where('organization_id', $organizationId))
                ->when($branchIds !== null, fn (Builder $file) => $file->whereIn('branch_id', $branchIds)))
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
                'activeClients' => Client::query()
                    ->where('organization_id', $organizationId)
                    ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('owning_branch_id', $branchIds))
                    ->where('status', 'active')
                    ->count(),
                'allocatedStands' => StandAllocation::query()
                    ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                    ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('branch_id', $branchIds))
                    ->where('status', 'allocated')
                    ->count(),
                'availableStands' => (int) ($inventory['available'] ?? 0),
                'totalCharges' => $totalCharges,
                'collections' => $totalCollections,
                'outstanding' => max(0, $totalCharges - $totalAllocated),
                'approvedExpenses' => $approvedExpenses,
                'pettyCashBalance' => $pettyCashBalance,
                'pendingApprovals' => ApprovalRequest::query()
                    ->where('organization_id', $organizationId)
                    ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('branch_id', $branchIds))
                    ->where('status', 'pending')
                    ->count(),
            ],
            'financialTrend' => $financialTrend,
            'inventory' => collect(['available', 'allocated', 'reserved', 'planned', 'withdrawn'])->map(fn (string $status) => [
                'status' => $status,
                'total' => (int) ($inventory[$status] ?? 0),
            ]),
            'exchangeRates' => $this->zimRateService->latestForDashboard(),
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
                    ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('branch_id', $branchIds))
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
            'branchFilter' => [
                'selected' => $selectedBranch ? (string) $selectedBranch->id : 'all',
                'label' => $scopeLabel,
                'canViewAll' => $canViewAllBranches,
                'options' => $branchOptions->map(fn (Branch $branch) => [
                    'id' => (string) $branch->id,
                    'code' => $branch->code,
                    'name' => $branch->name,
                ])->values(),
                'inventoryIsOrganizationWide' => true,
            ],
            'canViewReports' => $request->user()->can('reports.view'),
            'canViewExpenses' => $canViewExpenses,
            'currency' => $baseCurrency,
        ]);
    }
}
