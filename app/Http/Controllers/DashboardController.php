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
use App\Services\BranchAccessService;
use App\Services\CurrencyConversionService;
use App\Services\ZimRateService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly ZimRateService $zimRateService,
        private readonly BranchAccessService $branchAccess,
        private readonly CurrencyConversionService $currencyConverter,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        // Higher-level roles take precedence when an account has several roles.
        if (! $user->hasAnyRole(['Super Administrator', 'System Administrator', 'Branch Manager'])) {
            if ($user->hasRole('Accounts Officer') && $user->can('accounting.view') && $user->can('phase-one.view')) {
                return app(AccountingController::class)->index($request);
            }
            if ($user->hasRole('Call Centre') && $user->can('call-centre.view')) {
                return app(CallCentreController::class)->index($request);
            }

            return app(RoleDashboardController::class)->index($request);
        }
        $organizationId = (int) $user->organization_id;
        $baseCurrency = $user->organization?->base_currency_code ?? 'USD';
        $canViewExpenses = $user->can('expenses.view');
        $canViewAllBranches = $user->can('phase-one.manage');
        $branchOptions = $this->branchAccess->availableBranches($user);
        $selectedBranch = $branchOptions->firstWhere(
            'id',
            (int) $request->session()->get(BranchAccessService::SESSION_KEY),
        );
        abort_unless($selectedBranch, 403, 'Select an accessible branch before opening the dashboard.');
        $branchIds = collect([$selectedBranch->id]);

        $chargeScope = fn (Builder $query) => $query->whereHas('account.clientFile', fn (Builder $builder) => $builder
            ->whereHas('client', fn (Builder $client) => $client->where('organization_id', $organizationId))
            ->when($branchIds !== null, fn (Builder $file) => $file->whereIn('branch_id', $branchIds)));
        $paymentScope = fn (Builder $query) => $query
            ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->when($branchIds !== null, fn (Builder $builder) => $builder->whereIn('branch_id', $branchIds));
        $expenseScope = fn (Builder $query) => $query
            ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->when($branchIds !== null, fn (Builder $builder) => $builder->whereIn('branch_id', $branchIds));

        $totalCharges = AccountCharge::query()->tap($chargeScope)->whereNot('status', 'void')->get(['amount', 'currency_code', 'posted_at'])
            ->sum(fn (AccountCharge $charge) => $this->currencyConverter->convert((float) $charge->amount, $charge->currency_code, $baseCurrency, $charge->posted_at));
        $totalAllocated = PaymentAllocation::query()
            ->whereHas('charge.account.clientFile', fn (Builder $builder) => $builder
                ->whereHas('client', fn (Builder $client) => $client->where('organization_id', $organizationId))
                ->when($branchIds !== null, fn (Builder $file) => $file->whereIn('branch_id', $branchIds)))
            ->whereHas('payment', fn (Builder $payment) => $payment->where('status', 'approved'))
            ->with('payment:id,currency_code,received_at')
            ->get()
            ->sum(fn (PaymentAllocation $allocation) => $this->currencyConverter->convert((float) $allocation->amount, $allocation->payment->currency_code, $baseCurrency, $allocation->payment->received_at));
        $totalCollections = Payment::query()->tap($paymentScope)->where('status', 'approved')->get(['amount', 'currency_code', 'received_at'])
            ->sum(fn (Payment $payment) => $this->currencyConverter->convert((float) $payment->amount, $payment->currency_code, $baseCurrency, $payment->received_at));
        $approvedExpenses = Expense::query()->tap($expenseScope)->whereIn('status', ['approved', 'paid'])->get(['total_amount', 'currency_code', 'incurred_at'])
            ->sum(fn (Expense $expense) => $this->currencyConverter->convert((float) $expense->total_amount, $expense->currency_code, $baseCurrency, $expense->incurred_at));

        $pettyCashBalance = PettyCashEntry::query()
            ->tap($expenseScope)
            ->get(['entry_type', 'amount', 'currency_code', 'posted_at'])
            ->sum(fn (PettyCashEntry $entry) => in_array($entry->entry_type, ['replenishment', 'refund', 'adjustment'], true)
                ? $this->currencyConverter->convert((float) $entry->amount, $entry->currency_code, $baseCurrency, $entry->posted_at)
                : -1 * $this->currencyConverter->convert((float) $entry->amount, $entry->currency_code, $baseCurrency, $entry->posted_at));

        $inventory = Stand::query()
            ->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->selectRaw('physical_status, count(*) as total')
            ->groupBy('physical_status')
            ->pluck('total', 'physical_status');

        $branchInventory = Stand::query()
            ->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->whereHas('allocations', fn (Builder $builder) => $builder
                ->where('branch_id', $selectedBranch->id)
                ->where('status', '!=', 'cancelled'))
            ->selectRaw('physical_status, count(*) as total')
            ->groupBy('physical_status')
            ->pluck('total', 'physical_status');

        $allocationRegister = StandAllocation::query()
            ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId));
        $waitingList = Client::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'prospect');
        $registerInventory = collect([
            [
                'key' => 'on_ground',
                'label' => 'On ground',
                'description' => 'Allocated stand records',
                'total' => (clone $allocationRegister)->where('status', 'allocated')->where('category', '!=', 'special')->count(),
                'branch_total' => (clone $allocationRegister)->where('branch_id', $selectedBranch->id)->where('status', 'allocated')->where('category', '!=', 'special')->count(),
                'href' => '/administration/stand-allocations?status=allocated',
            ],
            [
                'key' => 'double_allocation',
                'label' => 'Double allocation',
                'description' => 'Disputed special allocations',
                'total' => (clone $allocationRegister)->where('category', 'special')->where('status', '!=', 'cancelled')->count(),
                'branch_total' => (clone $allocationRegister)->where('branch_id', $selectedBranch->id)->where('category', 'special')->where('status', '!=', 'cancelled')->count(),
                'href' => '/administration/stand-allocations?search=special',
            ],
            [
                'key' => 'waiting_list',
                'label' => 'Waiting list',
                'description' => 'Prospective clients awaiting allocation',
                'total' => (clone $waitingList)->count(),
                'branch_total' => (clone $waitingList)->where('owning_branch_id', $selectedBranch->id)->count(),
                'href' => '/administration/clients?status=prospect',
            ],
        ]);

        $financialTrend = collect(range(5, 0))->map(function (int $offset) use ($chargeScope, $paymentScope, $expenseScope, $baseCurrency) {
            $month = now()->startOfMonth()->subMonths($offset);
            $range = [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()];

            return [
                'month' => $month->format('M'),
                'label' => $month->format('F Y'),
                'charges' => AccountCharge::query()->tap($chargeScope)->whereNot('status', 'void')->whereBetween('posted_at', $range)->get()->sum(fn (AccountCharge $charge) => $this->currencyConverter->convert((float) $charge->amount, $charge->currency_code, $baseCurrency, $charge->posted_at)),
                'collections' => Payment::query()->tap($paymentScope)->where('status', 'approved')->whereBetween('received_at', $range)->get()->sum(fn (Payment $payment) => $this->currencyConverter->convert((float) $payment->amount, $payment->currency_code, $baseCurrency, $payment->received_at)),
                'expenses' => Expense::query()->tap($expenseScope)->whereIn('status', ['approved', 'paid'])->whereBetween('incurred_at', $range)->get()->sum(fn (Expense $expense) => $this->currencyConverter->convert((float) $expense->total_amount, $expense->currency_code, $baseCurrency, $expense->incurred_at)),
            ];
        });

        return Inertia::render('dashboard', [
            'dashboardTitle' => $user->hasAnyRole(['Super Administrator', 'System Administrator']) ? 'Operations dashboard' : 'Branch manager dashboard',
            'dashboardAudience' => $user->hasAnyRole(['Super Administrator', 'System Administrator']) ? 'Executive overview' : 'Branch oversight',
            'metrics' => [
                'portfolioValue' => Stand::query()->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))->whereNot('physical_status', 'withdrawn')->get(['list_price', 'currency_code', 'created_at'])
                    ->sum(fn (Stand $stand) => $this->currencyConverter->convert((float) $stand->list_price, $stand->currency_code, $baseCurrency, $stand->created_at)),
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
                'branch_total' => (int) ($branchInventory[$status] ?? 0),
            ]),
            'inventoryRegisters' => $registerInventory,
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
            'canApprovePayments' => $user->can('payments.approve'),
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
                'label' => $selectedBranch->name,
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
