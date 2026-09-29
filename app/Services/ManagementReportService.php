<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\BankDeposit;
use App\Models\Branch;
use App\Models\Development;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\ReconciliationRun;
use App\Models\ReportRefreshLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ManagementReportService
{
    public function build(int $organizationId): array
    {
        $organization = Organization::query()->findOrFail($organizationId);
        $chargeScope = fn (Builder $query) => $query->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId));
        $paymentScope = fn (Builder $query) => $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId));
        $expenseScope = fn (Builder $query) => $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId));

        $monthly = collect(range(11, 0))->map(function (int $offset) use ($chargeScope, $paymentScope, $expenseScope) {
            $month = now()->startOfMonth()->subMonths($offset);
            $range = [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()];

            return [
                'month' => $month->format('M'),
                'label' => $month->format('F Y'),
                'billed' => (float) AccountCharge::query()->tap($chargeScope)->whereNot('status', 'void')->whereBetween('posted_at', $range)->sum('amount'),
                'collected' => (float) Payment::query()->tap($paymentScope)->where('status', 'approved')->whereBetween('received_at', $range)->sum('amount'),
                'expenses' => (float) Expense::query()->tap($expenseScope)->whereIn('status', ['approved', 'paid'])->whereBetween('incurred_at', $range)->sum('total_amount'),
            ];
        });

        $aging = ['Current' => 0.0, '1-30 days' => 0.0, '31-60 days' => 0.0, '61-90 days' => 0.0, '90+ days' => 0.0];
        AccountCharge::query()
            ->tap($chargeScope)
            ->whereNotIn('status', ['paid', 'void'])
            ->withSum('paymentAllocations as allocated_amount', 'amount')
            ->get()
            ->each(function (AccountCharge $charge) use (&$aging) {
                $outstanding = max(0, (float) $charge->amount - (float) ($charge->allocated_amount ?? 0));
                $days = $charge->due_date ? $charge->due_date->diffInDays(now(), false) : 0;
                $bucket = match (true) {
                    $days <= 0 => 'Current',
                    $days <= 30 => '1-30 days',
                    $days <= 60 => '31-60 days',
                    $days <= 90 => '61-90 days',
                    default => '90+ days',
                };
                $aging[$bucket] += $outstanding;
            });

        $expenseByCategory = DB::table('expense_lines')
            ->join('expenses', 'expenses.id', '=', 'expense_lines.expense_id')
            ->join('branches', 'branches.id', '=', 'expenses.branch_id')
            ->join('expense_categories', 'expense_categories.id', '=', 'expense_lines.category_id')
            ->where('branches.organization_id', $organizationId)
            ->whereIn('expenses.status', ['approved', 'paid'])
            ->selectRaw('expense_categories.name as category, COUNT(DISTINCT expenses.id) as expense_count, SUM(expense_lines.amount + expense_lines.tax_amount) as total')
            ->groupBy('expense_categories.id', 'expense_categories.name')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'expense_count' => (int) $row->expense_count, 'total' => (float) $row->total]);

        $paymentMethods = DB::table('payments')
            ->join('branches', 'branches.id', '=', 'payments.branch_id')
            ->join('payment_methods', 'payment_methods.id', '=', 'payments.method_id')
            ->where('branches.organization_id', $organizationId)
            ->where('payments.status', 'approved')
            ->selectRaw('payment_methods.name as method, COUNT(payments.id) as payment_count, SUM(payments.amount) as total')
            ->groupBy('payment_methods.id', 'payment_methods.name')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => ['method' => $row->method, 'payment_count' => (int) $row->payment_count, 'total' => (float) $row->total]);

        $developmentPerformance = Development::query()
            ->where('organization_id', $organizationId)
            ->with(['phases.stands.allocations' => fn ($query) => $query->where('status', 'allocated')])
            ->get()
            ->map(function (Development $development) {
                $stands = $development->phases->flatMap->stands;
                $allocations = $stands->flatMap->allocations;

                return [
                    'development' => $development->name,
                    'location' => $development->location,
                    'total_stands' => $stands->count(),
                    'allocated_stands' => $stands->where('physical_status', 'allocated')->count(),
                    'inventory_value' => (float) $stands->sum('list_price'),
                    'allocated_value' => (float) $allocations->sum('effective_price'),
                ];
            });

        $branchPerformance = Branch::query()
            ->where('organization_id', $organizationId)
            ->orderBy('name')
            ->get()
            ->map(fn (Branch $branch) => [
                'branch' => $branch->name,
                'collections' => (float) Payment::query()->where('branch_id', $branch->id)->where('status', 'approved')->sum('amount'),
                'expenses' => (float) Expense::query()->where('branch_id', $branch->id)->whereIn('status', ['approved', 'paid'])->sum('total_amount'),
                'banked' => (float) BankDeposit::query()->where('branch_id', $branch->id)->whereIn('status', ['approved', 'cleared'])->sum('amount'),
                'unresolved_variance' => (float) ReconciliationRun::query()->where('branch_id', $branch->id)->whereNot('status', 'void')->sum(DB::raw('ABS(variance)')),
            ]);

        return [
            'organization' => [
                'code' => $organization->code,
                'name' => $organization->trading_name ?: $organization->legal_name,
            ],
            'generatedAt' => now()->toIso8601String(),
            'summary' => [
                'billed' => $monthly->sum('billed'),
                'collected' => $monthly->sum('collected'),
                'expenses' => $monthly->sum('expenses'),
                'outstanding' => array_sum($aging),
                'collectionRate' => $monthly->sum('billed') > 0 ? round(($monthly->sum('collected') / $monthly->sum('billed')) * 100, 1) : 0,
            ],
            'monthly' => $monthly,
            'receivablesAging' => collect($aging)->map(fn (float $total, string $bucket) => compact('bucket', 'total'))->values(),
            'expenseByCategory' => $expenseByCategory,
            'paymentMethods' => $paymentMethods,
            'developmentPerformance' => $developmentPerformance,
            'branchPerformance' => $branchPerformance,
            'refreshLogs' => ReportRefreshLog::query()->latest('started_at')->limit(5)->get()->map(fn (ReportRefreshLog $log) => [
                'dataset' => $log->dataset_name,
                'status' => $log->status,
                'row_count' => $log->row_count,
                'completed_at' => $log->completed_at?->toIso8601String(),
            ]),
            'currency' => $organization->base_currency_code ?: 'USD',
        ];
    }
}
