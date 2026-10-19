<?php

namespace App\Services;

use App\Models\SupplierBill;
use App\Models\SupplierPayment;
use App\Models\SupplierReconciliation;
use App\Models\SupplierReconciliationLine;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierReconciliationService
{
    public function refresh(SupplierReconciliation $reconciliation): SupplierReconciliation
    {
        $bills = SupplierBill::query()
            ->where('organization_id', $reconciliation->organization_id)
            ->where('supplier_id', $reconciliation->supplier_id)
            ->whereIn('status', ['posted', 'partially_paid', 'paid', 'overdue'])
            ->whereDate('bill_date', '<=', $reconciliation->to_date)
            ->when($reconciliation->branch_id, fn ($query) => $query->where('branch_id', $reconciliation->branch_id));
        $billed = (float) (clone $bills)->sum('total_amount');
        $paid = (float) SupplierPayment::query()
            ->whereHas('bill', fn ($query) => $query->where('organization_id', $reconciliation->organization_id)
                ->where('supplier_id', $reconciliation->supplier_id)
                ->when($reconciliation->branch_id, fn ($inner) => $inner->where('branch_id', $reconciliation->branch_id)))
            ->whereDate('payment_date', '<=', $reconciliation->to_date)
            ->sum('amount');
        $ledgerBalance = round($billed - $paid, 4);
        $reconciliation->forceFill([
            'ledger_balance' => $ledgerBalance,
            'variance' => round($ledgerBalance - (float) $reconciliation->statement_balance, 4),
        ])->save();

        return $reconciliation->fresh();
    }

    public function autoMatch(SupplierReconciliation $reconciliation, User $user): int
    {
        $this->ensureOpen($reconciliation);
        $matched = 0;
        $usedBills = $reconciliation->lines()->where('match_type', SupplierBill::class)->pluck('match_id');
        $usedPayments = $reconciliation->lines()->where('match_type', SupplierPayment::class)->pluck('match_id');

        foreach ($reconciliation->lines()->where('match_status', 'unmatched')->orderBy('transaction_date')->get() as $line) {
            $dateFrom = $line->transaction_date->copy()->subDays(7);
            $dateTo = $line->transaction_date->copy()->addDays(7);
            if ((float) $line->amount >= 0) {
                $candidate = SupplierBill::query()
                    ->where('organization_id', $reconciliation->organization_id)
                    ->where('supplier_id', $reconciliation->supplier_id)
                    ->whereIn('status', ['posted', 'partially_paid', 'paid', 'overdue'])
                    ->when($reconciliation->branch_id, fn ($query) => $query->where('branch_id', $reconciliation->branch_id))
                    ->whereNotIn('id', $usedBills)
                    ->whereBetween('bill_date', [$dateFrom, $dateTo])
                    ->where('total_amount', abs((float) $line->amount))
                    ->orderByRaw('CASE WHEN bill_no = ? OR supplier_reference = ? THEN 0 ELSE 1 END', [$line->reference, $line->reference])
                    ->first();
            } else {
                $candidate = SupplierPayment::query()
                    ->whereHas('bill', fn ($query) => $query->where('organization_id', $reconciliation->organization_id)
                        ->where('supplier_id', $reconciliation->supplier_id)
                        ->when($reconciliation->branch_id, fn ($inner) => $inner->where('branch_id', $reconciliation->branch_id)))
                    ->whereNotIn('id', $usedPayments)
                    ->whereBetween('payment_date', [$dateFrom, $dateTo])
                    ->where('amount', abs((float) $line->amount))
                    ->orderByRaw('CASE WHEN reference = ? THEN 0 ELSE 1 END', [$line->reference])
                    ->first();
            }
            if (! $candidate) {
                continue;
            }
            $this->applyMatch($line, $candidate::class, $candidate->id, $user);
            ((float) $line->amount >= 0 ? $usedBills : $usedPayments)->push($candidate->id);
            $matched++;
        }

        return $matched;
    }

    public function match(SupplierReconciliationLine $line, string $type, int $id, User $user): void
    {
        $line->loadMissing('reconciliation');
        $this->ensureOpen($line->reconciliation);
        $model = match ($type) {
            'bill' => SupplierBill::query()
                ->where('organization_id', $line->reconciliation->organization_id)
                ->where('supplier_id', $line->reconciliation->supplier_id)
                ->when($line->reconciliation->branch_id, fn ($query) => $query->where('branch_id', $line->reconciliation->branch_id))
                ->findOrFail($id),
            'payment' => SupplierPayment::query()
                ->whereHas('bill', fn ($query) => $query->where('organization_id', $line->reconciliation->organization_id)
                    ->where('supplier_id', $line->reconciliation->supplier_id)
                    ->when($line->reconciliation->branch_id, fn ($inner) => $inner->where('branch_id', $line->reconciliation->branch_id)))
                ->findOrFail($id),
            default => throw ValidationException::withMessages(['match' => 'Choose a supplier bill or supplier payment.']),
        };
        $expectedAmount = $model instanceof SupplierBill ? (float) $model->total_amount : -(float) $model->amount;
        if (abs($expectedAmount - (float) $line->amount) > 0.01) {
            throw ValidationException::withMessages(['match' => 'The selected record amount does not match the supplier statement line.']);
        }
        if ($line->reconciliation->lines()->where('id', '!=', $line->id)->where('match_type', $model::class)->where('match_id', $model->id)->exists()) {
            throw ValidationException::withMessages(['match' => 'That system transaction is already matched in this reconciliation.']);
        }
        $this->applyMatch($line, $model::class, $model->id, $user);
    }

    public function resolveException(SupplierReconciliationLine $line, string $note, User $user): void
    {
        $line->loadMissing('reconciliation');
        $this->ensureOpen($line->reconciliation);
        $line->forceFill(['match_status' => 'exception', 'match_type' => null, 'match_id' => null, 'resolution_note' => $note, 'matched_by' => $user->id, 'matched_at' => now()])->save();
    }

    public function reopenLine(SupplierReconciliationLine $line): void
    {
        $line->loadMissing('reconciliation');
        $this->ensureOpen($line->reconciliation);
        $line->forceFill(['match_status' => 'unmatched', 'match_type' => null, 'match_id' => null, 'resolution_note' => null, 'matched_by' => null, 'matched_at' => null])->save();
    }

    public function approve(SupplierReconciliation $reconciliation, User $user): SupplierReconciliation
    {
        return DB::transaction(function () use ($reconciliation, $user): SupplierReconciliation {
            $reconciliation = SupplierReconciliation::query()->lockForUpdate()->findOrFail($reconciliation->id);
            $this->ensureOpen($reconciliation);
            $this->refresh($reconciliation);
            $reconciliation->refresh();
            if (abs((float) $reconciliation->variance) > 0.01) {
                throw ValidationException::withMessages(['reconciliation' => 'The supplier statement variance must be zero before sign-off.']);
            }
            if ($reconciliation->lines()->where('match_status', 'unmatched')->exists()) {
                throw ValidationException::withMessages(['reconciliation' => 'Resolve every unmatched statement line before sign-off.']);
            }
            $reconciliation->forceFill(['status' => 'reconciled', 'approved_by' => $user->id, 'approved_at' => now()])->save();

            return $reconciliation;
        });
    }

    private function applyMatch(SupplierReconciliationLine $line, string $type, int $id, User $user): void
    {
        $line->forceFill(['match_status' => 'matched', 'match_type' => $type, 'match_id' => $id, 'resolution_note' => null, 'matched_by' => $user->id, 'matched_at' => now()])->save();
    }

    private function ensureOpen(SupplierReconciliation $reconciliation): void
    {
        if ($reconciliation->status === 'reconciled') {
            throw ValidationException::withMessages(['reconciliation' => 'A signed-off supplier reconciliation is read-only.']);
        }
    }
}
