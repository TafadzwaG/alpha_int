<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\AccountingBudget;
use App\Models\AccountingPeriod;
use App\Models\GlAccount;
use App\Models\InventoryMovement;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\SupplierBill;
use App\Models\SupplierPayment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GeneralLedgerService
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function createDraft(User $user, array $data): JournalEntry
    {
        return $this->create($user, $data, false);
    }

    public function createSystemJournal(int $organizationId, ?int $branchId, ?int $userId, array $data): ?JournalEntry
    {
        if (! GlAccount::query()->where('organization_id', $organizationId)->exists()) {
            return null;
        }

        $user = $userId ? User::query()->find($userId) : User::query()->where('organization_id', $organizationId)->oldest('id')->first();
        if (! $user) {
            return null;
        }

        return $this->create($user, [...$data, 'branch_id' => $branchId], true);
    }

    private function create(User $user, array $data, bool $postImmediately): JournalEntry
    {
        $date = now()->parse($data['entry_date'])->startOfDay();
        $period = $this->periodFor((int) $user->organization_id, $date->toDateString());
        $lines = collect($data['lines']);
        $debits = round((float) $lines->sum(fn (array $line) => (float) ($line['debit'] ?? 0)), 4);
        $credits = round((float) $lines->sum(fn (array $line) => (float) ($line['credit'] ?? 0)), 4);
        if ($debits <= 0 || abs($debits - $credits) > 0.0001) {
            throw ValidationException::withMessages(['lines' => 'Journal debits and credits must be equal and greater than zero.']);
        }
        if ($period->status !== 'open') {
            throw ValidationException::withMessages(['entry_date' => 'The accounting period for this date is closed.']);
        }

        return DB::transaction(function () use ($user, $data, $postImmediately, $period, $lines): JournalEntry {
            DB::table('organizations')->where('id', $user->organization_id)->lockForUpdate()->value('id');
            if (! empty($data['source_type']) && ! empty($data['source_id'])) {
                $existing = JournalEntry::query()->where('organization_id', $user->organization_id)
                    ->where('source_type', $data['source_type'])->where('source_id', $data['source_id'])->first();
                if ($existing) {
                    return $existing;
                }
            }
            $sequence = JournalEntry::query()->where('organization_id', $user->organization_id)
                ->whereYear('entry_date', now()->parse($data['entry_date'])->year)->count() + 1;
            $journal = JournalEntry::query()->create([
                'organization_id' => $user->organization_id,
                'branch_id' => $data['branch_id'] ?? null,
                'accounting_period_id' => $period->id,
                'journal_no' => sprintf('JNL-%s-%05d', now()->parse($data['entry_date'])->format('Y'), $sequence),
                'journal_type' => $data['journal_type'] ?? 'general',
                'entry_date' => $data['entry_date'],
                'reference' => $data['reference'] ?? null,
                'description' => $data['description'],
                'currency_code' => $data['currency_code'],
                'exchange_rate' => $data['exchange_rate'] ?? 1,
                'status' => $postImmediately ? 'posted' : 'draft',
                'source_type' => $data['source_type'] ?? null,
                'source_id' => $data['source_id'] ?? null,
                'created_by' => $user->id,
                'posted_by' => $postImmediately ? $user->id : null,
                'posted_at' => $postImmediately ? now() : null,
                'locked_at' => $postImmediately ? now() : null,
            ]);
            $rate = (float) $journal->exchange_rate;
            $validAccounts = GlAccount::query()->where('organization_id', $user->organization_id)->where('active', true)
                ->when(! $postImmediately, fn (Builder $query) => $query->where('allow_manual_posting', true))
                ->whereIn('id', $lines->pluck('gl_account_id'))->pluck('id');
            if ($validAccounts->count() !== $lines->pluck('gl_account_id')->unique()->count()) {
                throw ValidationException::withMessages(['lines' => 'One or more ledger accounts are invalid.']);
            }
            foreach ($lines->values() as $index => $line) {
                $debit = round((float) ($line['debit'] ?? 0), 4);
                $credit = round((float) ($line['credit'] ?? 0), 4);
                if (($debit > 0) === ($credit > 0)) {
                    throw ValidationException::withMessages(['lines' => 'Each journal line must contain either a debit or a credit.']);
                }
                $journal->lines()->create([
                    'gl_account_id' => $line['gl_account_id'],
                    'branch_id' => $line['branch_id'] ?? $journal->branch_id,
                    'client_account_id' => $line['client_account_id'] ?? null,
                    'accounting_dimension_id' => $line['accounting_dimension_id'] ?? null,
                    'line_number' => $index + 1,
                    'description' => $line['description'] ?? $journal->description,
                    'debit' => $debit,
                    'credit' => $credit,
                    'base_debit' => round($debit * $rate, 4),
                    'base_credit' => round($credit * $rate, 4),
                    'tax_code' => $line['tax_code'] ?? null,
                ]);
            }

            return $journal->load('lines.account');
        });
    }

    public function post(JournalEntry $journal, User $user): JournalEntry
    {
        return DB::transaction(function () use ($journal, $user): JournalEntry {
            $journal = JournalEntry::query()->lockForUpdate()->with('lines')->findOrFail($journal->id);
            if ($journal->status !== 'draft') {
                throw ValidationException::withMessages(['journal' => 'Only draft journals can be posted.']);
            }
            $period = $this->periodFor((int) $journal->organization_id, $journal->entry_date->toDateString());
            if ($period->status !== 'open') {
                throw ValidationException::withMessages(['journal' => 'The journal period is closed.']);
            }
            $debits = round((float) $journal->lines->sum('base_debit'), 4);
            $credits = round((float) $journal->lines->sum('base_credit'), 4);
            if ($debits <= 0 || abs($debits - $credits) > 0.0001) {
                throw ValidationException::withMessages(['journal' => 'The journal is not balanced.']);
            }
            $journal->forceFill(['status' => 'posted', 'accounting_period_id' => $period->id, 'posted_by' => $user->id, 'posted_at' => now(), 'locked_at' => now()])->save();

            return $journal;
        });
    }

    public function reverse(JournalEntry $journal, User $user, string $reason): JournalEntry
    {
        return DB::transaction(function () use ($journal, $user, $reason): JournalEntry {
            $journal = JournalEntry::query()->lockForUpdate()->with('lines')->findOrFail($journal->id);
            if ($journal->status !== 'posted') {
                throw ValidationException::withMessages(['journal' => 'Only posted journals can be reversed.']);
            }
            if (JournalEntry::query()->where('reversal_of_id', $journal->id)->exists()) {
                throw ValidationException::withMessages(['journal' => 'This journal already has a reversal.']);
            }

            $reversal = $this->create($user, [
                'branch_id' => $journal->branch_id,
                'entry_date' => today()->toDateString(),
                'journal_type' => 'reversal',
                'reference' => 'REV-'.$journal->journal_no,
                'description' => 'Reversal: '.$reason,
                'currency_code' => $journal->currency_code,
                'exchange_rate' => $journal->exchange_rate,
                'lines' => $journal->lines->map(fn ($line) => ['gl_account_id' => $line->gl_account_id, 'branch_id' => $line->branch_id, 'client_account_id' => $line->client_account_id, 'accounting_dimension_id' => $line->accounting_dimension_id, 'description' => 'Reversal of '.$line->description, 'debit' => (float) $line->credit, 'credit' => (float) $line->debit])->all(),
            ], true);
            $reversal->forceFill(['reversal_of_id' => $journal->id])->save();
            $journal->forceFill(['status' => 'reversed', 'reversed_by' => $user->id, 'reversed_at' => now()])->save();

            return $reversal;
        });
    }

    public function report(User $user, string $type, string $from, string $to, ?int $branchId): array
    {
        if ($type === 'cash-flow') {
            return $this->cashFlowReport($user, $from, $to, $branchId);
        }
        if ($type === 'comparative-income') {
            return $this->comparativeIncomeReport($user, $from, $to, $branchId);
        }
        if ($type === 'monthly-performance') {
            return $this->monthlyPerformanceReport($user, $from, $to, $branchId);
        }
        if ($type === 'budget-variance') {
            return $this->budgetVarianceReport($user, $from, $to, $branchId);
        }
        if ($type === 'control-reconciliation') {
            return $this->controlReconciliationReport($user, $from, $to, $branchId);
        }
        $accounts = GlAccount::query()->where('organization_id', $user->organization_id)->where('active', true)->orderBy('code')->get();
        $accessibleBranchIds = $this->branchAccess->branchIds($user);
        $query = DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_entries.organization_id', $user->organization_id)->where('journal_entries.status', 'posted')
            ->when(
                in_array($type, ['trial-balance', 'balance-sheet'], true),
                fn ($builder) => $builder->whereDate('journal_entries.entry_date', '<=', $to),
                fn ($builder) => $builder->whereBetween('journal_entries.entry_date', [$from, $to]),
            )
            ->when($accessibleBranchIds !== null, fn ($q) => $q->whereIn('journal_entries.branch_id', $accessibleBranchIds))
            ->when($branchId, fn ($q) => $q->where('journal_entries.branch_id', $branchId));
        $totals = (clone $query)->selectRaw('journal_lines.gl_account_id, SUM(journal_lines.base_debit) debit, SUM(journal_lines.base_credit) credit')->groupBy('journal_lines.gl_account_id')->get()->keyBy('gl_account_id');
        $rows = $accounts->map(function (GlAccount $account) use ($totals): array {
            $debit = (float) ($totals[$account->id]->debit ?? 0);
            $credit = (float) ($totals[$account->id]->credit ?? 0);

            return ['id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'type' => $account->type, 'debit' => $debit, 'credit' => $credit, 'balance' => $account->normal_balance === 'debit' ? $debit - $credit : $credit - $debit];
        })->filter(fn (array $row) => abs($row['debit']) > 0.0001 || abs($row['credit']) > 0.0001)->values();

        if ($type === 'general-ledger') {
            $details = (clone $query)->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
                ->select('journal_entries.entry_date', 'journal_entries.journal_no', 'journal_entries.reference', 'journal_entries.description as journal_description', 'gl_accounts.code', 'gl_accounts.name', 'journal_lines.description', 'journal_lines.base_debit as debit', 'journal_lines.base_credit as credit')
                ->orderBy('journal_entries.entry_date')->orderBy('journal_entries.id')->orderBy('journal_lines.line_number')->get();

            return ['type' => $type, 'rows' => $details, 'summary' => []];
        }

        $filtered = match ($type) {
            'income-statement' => $rows->whereIn('type', ['revenue', 'expense'])->values(),
            'balance-sheet' => $rows->whereIn('type', ['asset', 'liability', 'equity'])->values(),
            default => $rows,
        };
        $summary = [
            'debits' => (float) $rows->sum('debit'),
            'credits' => (float) $rows->sum('credit'),
            'revenue' => (float) $rows->where('type', 'revenue')->sum('balance'),
            'expenses' => (float) $rows->where('type', 'expense')->sum('balance'),
            'assets' => (float) $rows->where('type', 'asset')->sum('balance'),
            'liabilities' => (float) $rows->where('type', 'liability')->sum('balance'),
            'equity' => (float) $rows->where('type', 'equity')->sum('balance'),
        ];
        $summary['profit'] = $summary['revenue'] - $summary['expenses'];

        return ['type' => $type, 'rows' => $filtered, 'summary' => $summary];
    }

    private function cashFlowReport(User $user, string $from, string $to, ?int $branchId): array
    {
        $accessible = $this->branchAccess->branchIds($user);
        $data = DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
            ->where('journal_entries.organization_id', $user->organization_id)->where('journal_entries.status', 'posted')
            ->whereBetween('journal_entries.entry_date', [$from, $to])->whereIn('gl_accounts.system_key', ['bank', 'cash_clearing'])
            ->when($accessible !== null, fn ($query) => $query->whereIn('journal_entries.branch_id', $accessible))
            ->when($branchId, fn ($query) => $query->where('journal_entries.branch_id', $branchId))
            ->selectRaw('journal_entries.journal_type, SUM(journal_lines.base_debit) cash_in, SUM(journal_lines.base_credit) cash_out')
            ->groupBy('journal_entries.journal_type')->get();
        $groups = ['operating' => ['in' => 0.0, 'out' => 0.0], 'investing' => ['in' => 0.0, 'out' => 0.0], 'financing' => ['in' => 0.0, 'out' => 0.0]];
        foreach ($data as $row) {
            $category = str_contains($row->journal_type, 'asset') ? 'investing' : (str_contains($row->journal_type, 'loan') || str_contains($row->journal_type, 'capital') ? 'financing' : 'operating');
            $groups[$category]['in'] += (float) $row->cash_in;
            $groups[$category]['out'] += (float) $row->cash_out;
        }
        $rows = collect($groups)->map(fn (array $values, string $category): array => ['code' => strtoupper(substr($category, 0, 3)), 'name' => ucfirst($category).' activities', 'type' => 'cash_flow', 'debit' => round($values['in'], 4), 'credit' => round($values['out'], 4), 'balance' => round($values['in'] - $values['out'], 4)])
            ->values()->map(fn (array $row, int $index): array => ['id' => $index + 1, ...$row]);

        return ['type' => 'cash-flow', 'rows' => $rows, 'summary' => ['debits' => $rows->sum('debit'), 'credits' => $rows->sum('credit'), 'profit' => $rows->sum('balance')]];
    }

    private function comparativeIncomeReport(User $user, string $from, string $to, ?int $branchId): array
    {
        $days = Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1;
        $priorTo = Carbon::parse($from)->subDay();
        $priorFrom = $priorTo->copy()->subDays($days - 1);
        $current = $this->report($user, 'income-statement', $from, $to, $branchId);
        $prior = collect($this->report($user, 'income-statement', $priorFrom->toDateString(), $priorTo->toDateString(), $branchId)['rows'])->keyBy('id');
        $rows = collect($current['rows'])->map(function (array $row) use ($prior): array {
            $priorBalance = (float) ($prior->get($row['id'])['balance'] ?? 0);

            return [...$row, 'debit' => $row['balance'], 'credit' => $priorBalance, 'balance' => round($row['balance'] - $priorBalance, 4)];
        });

        return ['type' => 'comparative-income', 'rows' => $rows, 'summary' => ['debits' => $rows->sum('debit'), 'credits' => $rows->sum('credit'), 'profit' => $rows->sum('balance')]];
    }

    private function monthlyPerformanceReport(User $user, string $from, string $to, ?int $branchId): array
    {
        $accessible = $this->branchAccess->branchIds($user);
        $data = DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
            ->where('journal_entries.organization_id', $user->organization_id)->where('journal_entries.status', 'posted')->whereBetween('journal_entries.entry_date', [$from, $to])
            ->whereIn('gl_accounts.type', ['revenue', 'expense'])->when($accessible !== null, fn ($query) => $query->whereIn('journal_entries.branch_id', $accessible))->when($branchId, fn ($query) => $query->where('journal_entries.branch_id', $branchId))
            ->get(['journal_entries.entry_date', 'gl_accounts.type', 'journal_lines.base_debit as debit', 'journal_lines.base_credit as credit'])
            ->groupBy(fn ($row) => Carbon::parse($row->entry_date)->format('Y-m'));
        $rows = $data->map(function (Collection $items, string $month): array {
            $revenueRows = $items->where('type', 'revenue');
            $expenseRows = $items->where('type', 'expense');
            $revenue = (float) $revenueRows->sum('credit') - (float) $revenueRows->sum('debit');
            $expense = (float) $expenseRows->sum('debit') - (float) $expenseRows->sum('credit');

            return ['code' => $month, 'name' => Carbon::createFromFormat('Y-m', $month)->format('F Y'), 'type' => 'monthly', 'debit' => $revenue, 'credit' => $expense, 'balance' => round($revenue - $expense, 4)];
        })->values()->map(fn (array $row, int $index): array => ['id' => $index + 1, ...$row]);

        return ['type' => 'monthly-performance', 'rows' => $rows, 'summary' => ['debits' => $rows->sum('debit'), 'credits' => $rows->sum('credit'), 'profit' => $rows->sum('balance')]];
    }

    private function budgetVarianceReport(User $user, string $from, string $to, ?int $branchId): array
    {
        $budgets = AccountingBudget::query()->where('organization_id', $user->organization_id)->whereHas('fiscalYear', fn ($query) => $query->whereDate('starts_on', '<=', $to)->whereDate('ends_on', '>=', $from))->with('account')->get()->groupBy('gl_account_id');
        $actual = collect($this->report($user, 'income-statement', $from, $to, $branchId)['rows'])->keyBy('id');
        $rows = $budgets->map(function (Collection $lines, int $accountId): array {
            $account = $lines->first()->account;
            $budget = (float) $lines->sum('amount');

            return ['id' => $accountId, 'code' => $account->code, 'name' => $account->name, 'type' => $account->type, 'debit' => $budget, 'credit' => 0.0, 'balance' => $budget];
        })->values();
        $rows = $rows->map(function (array $row) use ($actual): array {
            $value = (float) ($actual->get($row['id'])['balance'] ?? 0);

            return [...$row, 'credit' => $value, 'balance' => round($row['debit'] - $value, 4)];
        });

        return ['type' => 'budget-variance', 'rows' => $rows, 'summary' => ['debits' => $rows->sum('debit'), 'credits' => $rows->sum('credit'), 'profit' => $rows->sum('balance')]];
    }

    private function controlReconciliationReport(User $user, string $from, string $to, ?int $branchId): array
    {
        $branchIds = $this->branchAccess->branchIds($user);
        $accounts = GlAccount::query()->where('organization_id', $user->organization_id)->whereIn('system_key', ['accounts_receivable', 'accounts_payable', 'inventory'])->get()->keyBy('system_key');
        $ledger = DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')->where('journal_entries.organization_id', $user->organization_id)->where('journal_entries.status', 'posted')->whereDate('journal_entries.entry_date', '<=', $to)
            ->when($branchIds !== null, fn ($query) => $query->whereIn('journal_entries.branch_id', $branchIds))->when($branchId, fn ($query) => $query->where('journal_entries.branch_id', $branchId))->whereIn('journal_lines.gl_account_id', $accounts->pluck('id'))
            ->selectRaw('journal_lines.gl_account_id, SUM(journal_lines.base_debit - journal_lines.base_credit) balance')->groupBy('journal_lines.gl_account_id')->pluck('balance', 'gl_account_id');
        $receivables = (float) AccountCharge::query()
            ->whereHas('account.clientFile.client', fn ($query) => $query->where('organization_id', $user->organization_id))
            ->whereHas('account.clientFile', fn ($query) => $query
                ->when($branchIds !== null, fn ($inner) => $inner->whereIn('branch_id', $branchIds))
                ->when($branchId, fn ($inner) => $inner->where('branch_id', $branchId)))
            ->whereIn('status', ['posted', 'partially_paid', 'paid'])->whereDate('posted_at', '<=', $to)->sum('amount')
            - (float) Payment::query()->whereHas('account.clientFile.client', fn ($query) => $query->where('organization_id', $user->organization_id))
                ->where('status', 'approved')->whereDate('received_at', '<=', $to)
                ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))
                ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))->sum('amount');
        $payables = (float) SupplierBill::query()->where('organization_id', $user->organization_id)
            ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->whereIn('status', ['posted', 'partially_paid', 'paid', 'overdue'])->whereDate('bill_date', '<=', $to)->sum('total_amount')
            - (float) SupplierPayment::query()->whereHas('bill', fn ($query) => $query->where('organization_id', $user->organization_id)
                ->when($branchIds !== null, fn ($inner) => $inner->whereIn('branch_id', $branchIds))->when($branchId, fn ($inner) => $inner->where('branch_id', $branchId)))
                ->whereDate('payment_date', '<=', $to)->sum('amount');
        $inventory = (float) InventoryMovement::query()->where('organization_id', $user->organization_id)
            ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->whereDate('occurred_at', '<=', $to)->selectRaw('COALESCE(SUM(quantity * unit_cost), 0) value')->value('value');
        $subledgers = ['accounts_receivable' => $receivables, 'accounts_payable' => $payables, 'inventory' => $inventory];
        $rows = $accounts->values()->map(function (GlAccount $account) use ($ledger, $subledgers): array {
            $gl = (float) ($ledger[$account->id] ?? 0);
            if ($account->normal_balance === 'credit') {
                $gl *= -1;
            } $sub = $subledgers[$account->system_key] ?? 0;

            return ['id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'type' => 'control', 'debit' => $gl, 'credit' => $sub, 'balance' => round($gl - $sub, 4)];
        });

        return ['type' => 'control-reconciliation', 'rows' => $rows, 'summary' => ['debits' => $rows->sum('debit'), 'credits' => $rows->sum('credit'), 'profit' => $rows->sum('balance')]];
    }

    public function cashMovement(User $user, string $from, string $to, ?int $branchId): array
    {
        $accessibleBranchIds = $this->branchAccess->branchIds($user);
        $base = DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
            ->leftJoin('branches', 'branches.id', '=', 'journal_entries.branch_id')
            ->where('journal_entries.organization_id', $user->organization_id)
            ->where('journal_entries.status', 'posted')
            ->whereIn('gl_accounts.system_key', ['bank', 'cash_clearing'])
            ->when($accessibleBranchIds !== null, fn ($query) => $query->whereIn('journal_entries.branch_id', $accessibleBranchIds))
            ->when($branchId, fn ($query) => $query->where('journal_entries.branch_id', $branchId));

        $opening = (float) (clone $base)->whereDate('journal_entries.entry_date', '<', $from)
            ->selectRaw('COALESCE(SUM(journal_lines.base_debit - journal_lines.base_credit), 0) balance')
            ->value('balance');
        $movements = (clone $base)->whereDate('journal_entries.entry_date', '>=', $from)
            ->whereDate('journal_entries.entry_date', '<=', $to)
            ->select([
                'journal_lines.id',
                'journal_entries.entry_date',
                'journal_entries.journal_no',
                'journal_entries.journal_type',
                'journal_entries.reference',
                'journal_entries.description',
                'journal_entries.source_type',
                'gl_accounts.name as cash_account',
                'branches.name as branch',
                'journal_lines.base_debit as cash_in',
                'journal_lines.base_credit as cash_out',
            ])
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_entries.id')
            ->orderBy('journal_lines.line_number')
            ->get();

        $running = $opening;
        $rows = $movements->map(function ($row) use (&$running): array {
            $cashIn = (float) $row->cash_in;
            $cashOut = (float) $row->cash_out;
            $running += $cashIn - $cashOut;

            return [
                'id' => $row->id,
                'date' => $row->entry_date,
                'journal_no' => $row->journal_no,
                'type' => $row->journal_type,
                'source' => $row->source_type ? class_basename($row->source_type) : 'Manual journal',
                'reference' => $row->reference,
                'description' => $row->description,
                'cash_account' => $row->cash_account,
                'branch' => $row->branch,
                'cash_in' => round($cashIn, 4),
                'cash_out' => round($cashOut, 4),
                'running_balance' => round($running, 4),
            ];
        });
        $monthly = $rows->groupBy(fn (array $row) => Carbon::parse($row['date'])->format('Y-m'))
            ->map(fn (Collection $items, string $month): array => [
                'month' => $month,
                'label' => Carbon::createFromFormat('Y-m', $month)->format('M Y'),
                'cash_in' => round((float) $items->sum('cash_in'), 4),
                'cash_out' => round((float) $items->sum('cash_out'), 4),
            ])->values();
        $cashIn = (float) $rows->sum('cash_in');
        $cashOut = (float) $rows->sum('cash_out');

        return [
            'summary' => [
                'opening_balance' => round($opening, 4),
                'cash_in' => round($cashIn, 4),
                'cash_out' => round($cashOut, 4),
                'net_movement' => round($cashIn - $cashOut, 4),
                'closing_balance' => round($opening + $cashIn - $cashOut, 4),
            ],
            'monthly' => $monthly,
            'movements' => $rows->sortByDesc(fn (array $row) => $row['date'].'-'.str_pad((string) $row['id'], 12, '0', STR_PAD_LEFT))->values(),
        ];
    }

    public function accessibleBranches(User $user): Collection
    {
        return $this->branchAccess->availableBranches($user);
    }

    public function journalQuery(User $user): Builder
    {
        $branchIds = $this->branchAccess->branchIds($user);

        return JournalEntry::query()->where('organization_id', $user->organization_id)
            ->when($branchIds !== null, fn (Builder $query) => $query->whereIn('branch_id', $branchIds));
    }

    private function periodFor(int $organizationId, string $date): AccountingPeriod
    {
        $period = AccountingPeriod::query()->whereHas('fiscalYear', fn (Builder $query) => $query->where('organization_id', $organizationId))
            ->whereDate('starts_on', '<=', $date)->whereDate('ends_on', '>=', $date)->first();
        if (! $period) {
            throw ValidationException::withMessages(['entry_date' => 'No fiscal period exists for this date.']);
        }

        return $period;
    }
}
