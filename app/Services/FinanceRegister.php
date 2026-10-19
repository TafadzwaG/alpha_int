<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FinanceRegister
{
    public const KEYS = ['bank-deposits', 'cash-sessions', 'expenses', 'petty-cash-entries'];

    public function apply(string $key, Builder $query, Request $request): array
    {
        $filters = $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('date_from') ? ['after_or_equal:date_from'] : [])],
            'currency_code' => ['nullable', 'string', 'max:3'],
            'amount_min' => ['nullable', 'numeric', 'min:0'],
            'amount_max' => ['nullable', 'numeric', 'min:0', ...($request->filled('amount_min') ? ['gte:amount_min'] : [])],
            'cashier_id' => ['nullable', 'integer'],
            'bank_account_id' => ['nullable', 'integer'],
            'category_id' => ['nullable', 'integer'],
            'entry_type' => ['nullable', Rule::in(['replenishment', 'refund', 'disbursement', 'adjustment'])],
            'variance' => ['nullable', Rule::in(['balanced', 'short', 'over', 'undeclared'])],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'amount_high', 'amount_low', 'date_newest', 'date_oldest'])],
            'per_page' => ['nullable', Rule::in([10, 20, 50, 100])],
        ]);
        $date = match ($key) {
            'bank-deposits' => 'deposit_date', 'cash-sessions' => 'opened_at', 'expenses' => 'incurred_at', default => 'posted_at'
        };
        $amount = match ($key) {
            'cash-sessions' => 'expected_cash', 'expenses' => 'total_amount', default => 'amount'
        };
        foreach (['date_from' => '>=', 'date_to' => '<='] as $field => $operator) {
            if (! empty($filters[$field])) {
                $query->whereDate($date, $operator, $filters[$field]);
            }
        }
        foreach (['amount_min' => '>=', 'amount_max' => '<='] as $field => $operator) {
            if (isset($filters[$field])) {
                $query->where($amount, $operator, $filters[$field]);
            }
        }
        if (! empty($filters['currency_code'])) {
            $query->where('currency_code', $filters['currency_code']);
        }
        if ($key === 'cash-sessions') {
            if (! empty($filters['cashier_id'])) {
                $query->where('cashier_id', $filters['cashier_id']);
            }
            match ($filters['variance'] ?? '') {
                'undeclared' => $query->whereNull('declared_cash'),
                'balanced' => $query->whereNotNull('declared_cash')->whereColumn('declared_cash', 'expected_cash'),
                'short' => $query->whereNotNull('declared_cash')->whereColumn('declared_cash', '<', 'expected_cash'),
                'over' => $query->whereNotNull('declared_cash')->whereColumn('declared_cash', '>', 'expected_cash'),
                default => null,
            };
        }
        if ($key === 'bank-deposits' && ! empty($filters['bank_account_id'])) {
            $query->where('bank_account_id', $filters['bank_account_id']);
        }
        if ($key === 'expenses' && ! empty($filters['category_id'])) {
            $query->whereHas('lines', fn ($q) => $q->where('category_id', $filters['category_id']));
        }
        if ($key === 'petty-cash-entries' && ! empty($filters['entry_type'])) {
            $query->where('entry_type', $filters['entry_type']);
        }
        $search = trim((string) $request->string('search'));
        if ($search !== '') {
            $query->where(function (Builder $q) use ($key, $search) {
                $like = '%'.$search.'%';
                $q->whereHas('branch', fn ($b) => $b->where('name', 'like', $like));
                if ($key === 'cash-sessions') {
                    $q->orWhereHas('cashier', fn ($u) => $u->where('name', 'like', $like))->orWhere('status', 'like', $like);
                }
                if ($key === 'bank-deposits') {
                    $q->orWhere('reference', 'like', $like)->orWhereHas('bankAccount', fn ($b) => $b->where('bank_name', 'like', $like)->orWhere('account_mask', 'like', $like));
                }
                if ($key === 'expenses') {
                    $q->orWhere('expense_no', 'like', $like)->orWhere('payee', 'like', $like)->orWhere('purpose', 'like', $like)->orWhereHas('lines.category', fn ($c) => $c->where('name', 'like', $like));
                }
                if ($key === 'petty-cash-entries') {
                    $q->orWhere('entry_type', 'like', $like)->orWhereHas('expense', fn ($e) => $e->where('expense_no', 'like', $like)->orWhere('payee', 'like', $like))->orWhereHas('poster', fn ($u) => $u->where('name', 'like', $like));
                }
            });
        }
        $count = fn (string $field, array $values) => (clone $query)->whereIn($field, $values)->count();
        $stats = [['label' => 'Matching records', 'value' => (clone $query)->count(), 'icon' => 'records']];
        if ($key === 'cash-sessions') {
            $stats[] = ['label' => 'Open sessions', 'value' => $count('status', ['open']), 'icon' => 'open'];
            $stats[] = ['label' => 'Closing sessions', 'value' => $count('status', ['closing']), 'icon' => 'clock'];
            $stats[] = ['label' => 'Declared differences', 'value' => (clone $query)->whereNotNull('declared_cash')->whereColumn('declared_cash', '!=', 'expected_cash')->count(), 'icon' => 'alert'];
        } elseif ($key === 'bank-deposits') {
            $stats[] = ['label' => 'Awaiting approval', 'value' => $count('status', ['submitted']), 'icon' => 'clock'];
            $stats[] = ['label' => 'Approved, awaiting clearance', 'value' => $count('status', ['approved']), 'icon' => 'alert'];
            $stats[] = ['label' => 'Cleared deposits', 'value' => $count('status', ['cleared']), 'icon' => 'open'];
        } elseif ($key === 'expenses') {
            $stats[] = ['label' => 'Awaiting approval', 'value' => $count('status', ['submitted']), 'icon' => 'clock'];
            $stats[] = ['label' => 'Approved expenses', 'value' => $count('status', ['approved']), 'icon' => 'open'];
            $stats[] = ['label' => 'Paid expenses', 'value' => $count('status', ['paid']), 'icon' => 'cash'];
        } else {
            $stats[] = ['label' => 'Cash in', 'totals' => $this->totals((clone $query)->whereIn('entry_type', ['replenishment', 'refund', 'adjustment']), $amount), 'icon' => 'open'];
            $stats[] = ['label' => 'Disbursements', 'totals' => $this->totals((clone $query)->where('entry_type', 'disbursement'), $amount), 'icon' => 'cash'];
            $stats[] = ['label' => 'Net movement', 'totals' => $this->totals($query, "CASE WHEN entry_type = 'disbursement' THEN -amount ELSE amount END"), 'icon' => 'records'];
        }
        if (in_array($filters['sort'] ?? '', ['amount_high', 'amount_low'])) {
            $query->orderBy($amount, $filters['sort'] === 'amount_low' ? 'asc' : 'desc');
        }
        if (in_array($filters['sort'] ?? '', ['date_newest', 'date_oldest'])) {
            $query->orderBy($date, $filters['sort'] === 'date_oldest' ? 'asc' : 'desc');
        }

        return ['filters' => $filters, 'cards' => $stats];
    }

    private function totals(Builder $query, string $expression): array
    {
        return (clone $query)->reorder()->selectRaw('currency_code, SUM('.$expression.') as aggregate')->groupBy('currency_code')->get()->map(fn ($row) => ['currency' => $row->currency_code, 'amount' => (float) $row->aggregate])->all();
    }
}
