<?php

namespace App\Services;

use App\Models\AccountingClose;
use App\Models\AccountingPeriod;
use App\Models\BankReconciliation;
use App\Models\BankReconciliationItem;
use App\Models\BankRule;
use App\Models\CatalogItem;
use App\Models\FiscalYear;
use App\Models\GlAccount;
use App\Models\InventoryControl;
use App\Models\InventoryMovement;
use App\Models\JournalEntry;
use App\Models\User;
use App\Models\VatReturn;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountingControlService
{
    public function __construct(
        private readonly GeneralLedgerService $ledger,
        private readonly TaxReportService $taxReports,
    ) {}

    public function createBankReconciliation(User $user, array $data): BankReconciliation
    {
        return DB::transaction(function () use ($user, $data): BankReconciliation {
            $bank = DB::table('bank_accounts')->where('organization_id', $user->organization_id)->where('id', $data['bank_account_id'])->first();
            abort_unless($bank, 404);
            $accountId = $bank->gl_account_id ?: GlAccount::query()->where('organization_id', $user->organization_id)->where('system_key', 'bank')->value('id');
            if (! $bank->gl_account_id && $accountId) {
                DB::table('bank_accounts')->where('id', $bank->id)->update(['gl_account_id' => $accountId]);
            }
            $ledgerClosing = (float) DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
                ->where('journal_entries.organization_id', $user->organization_id)->where('journal_entries.status', 'posted')
                ->where('journal_lines.gl_account_id', $accountId)->whereDate('journal_entries.entry_date', '<=', $data['to_date'])
                ->selectRaw('COALESCE(SUM(journal_lines.base_debit - journal_lines.base_credit), 0) balance')->value('balance');
            $record = BankReconciliation::query()->create([
                ...$data,
                'organization_id' => $user->organization_id,
                'ledger_closing_balance' => round($ledgerClosing, 4),
                'difference' => round((float) $data['closing_statement_balance'] - $ledgerClosing, 4),
                'status' => 'draft',
                'prepared_by' => $user->id,
            ]);
            if (! empty($data['bank_statement_import_id'])) {
                $lines = DB::table('bank_statement_lines')->where('bank_statement_import_id', $data['bank_statement_import_id'])->get();
                foreach ($lines as $line) {
                    BankReconciliationItem::query()->create([
                        'bank_reconciliation_id' => $record->id,
                        'bank_statement_line_id' => $line->id,
                        'journal_entry_id' => $line->match_type === JournalEntry::class ? $line->match_id : null,
                        'status' => $line->match_type ? 'matched' : 'unmatched',
                        'matched_by' => $line->matched_by,
                        'matched_at' => $line->matched_at,
                    ]);
                }
            }

            return $record->load('items.statementLine');
        });
    }

    public function applyBankRules(BankReconciliation $reconciliation, User $user): int
    {
        $reconciliation->load(['bankAccount', 'items.statementLine']);
        $rules = BankRule::query()->where('organization_id', $reconciliation->organization_id)->where('active', true)
            ->where(fn ($query) => $query->whereNull('bank_account_id')->orWhere('bank_account_id', $reconciliation->bank_account_id))
            ->orderBy('priority')->get();
        $bankAccountId = $reconciliation->bankAccount->gl_account_id ?: GlAccount::query()->where('organization_id', $reconciliation->organization_id)->where('system_key', 'bank')->value('id');
        $matched = 0;
        foreach ($reconciliation->items->where('status', 'unmatched') as $item) {
            $line = $item->statementLine;
            $rule = $rules->first(fn (BankRule $candidate): bool => $this->ruleMatches($candidate, $line->description.' '.$line->reference));
            if (! $rule) {
                continue;
            }
            $amount = abs((float) $line->amount);
            $incoming = (float) $line->amount > 0;
            $journal = $this->ledger->createSystemJournal($reconciliation->organization_id, $reconciliation->bankAccount->branch_id, $user->id, [
                'entry_date' => $line->transaction_date->toDateString(), 'journal_type' => 'bank_rule', 'reference' => $line->reference,
                'description' => $line->description, 'currency_code' => $reconciliation->bankAccount->currency_code,
                'source_type' => BankReconciliationItem::class, 'source_id' => $item->id,
                'lines' => [
                    ['gl_account_id' => $incoming ? $bankAccountId : $rule->counter_account_id, 'accounting_dimension_id' => $rule->accounting_dimension_id, 'debit' => $amount, 'credit' => 0],
                    ['gl_account_id' => $incoming ? $rule->counter_account_id : $bankAccountId, 'accounting_dimension_id' => $rule->accounting_dimension_id, 'debit' => 0, 'credit' => $amount],
                ],
            ]);
            $item->forceFill(['journal_entry_id' => $journal?->id, 'status' => 'matched', 'resolution_note' => "Applied bank rule: {$rule->name}", 'matched_by' => $user->id, 'matched_at' => now()])->save();
            $line->forceFill(['match_type' => JournalEntry::class, 'match_id' => $journal?->id, 'matched_by' => $user->id, 'matched_at' => now()])->save();
            $matched++;
        }
        $this->refreshReconciliation($reconciliation);

        return $matched;
    }

    public function resolveBankItem(BankReconciliationItem $item, User $user, string $status, ?int $journalId, ?string $note): void
    {
        $reconciliation = $item->bankReconciliation()->firstOrFail();
        if (in_array($reconciliation->status, ['approved', 'signed_off'], true)) {
            throw ValidationException::withMessages(['item' => 'Signed-off reconciliations are immutable.']);
        }
        $item->forceFill(['status' => $status, 'journal_entry_id' => $journalId, 'resolution_note' => $note, 'matched_by' => $user->id, 'matched_at' => now()])->save();
        $this->refreshReconciliation($reconciliation);
    }

    public function reviewBankReconciliation(BankReconciliation $reconciliation, User $user, ?string $note): void
    {
        if ((int) $reconciliation->prepared_by === (int) $user->id) {
            throw ValidationException::withMessages(['reconciliation' => 'Maker-checker control requires another user to review this reconciliation.']);
        }
        $this->refreshReconciliation($reconciliation);
        if ($reconciliation->items()->where('status', 'unmatched')->exists()) {
            throw ValidationException::withMessages(['reconciliation' => 'Resolve every unmatched statement line before review.']);
        }
        $reconciliation->forceFill(['status' => 'reviewed', 'review_note' => $note, 'reviewed_by' => $user->id, 'reviewed_at' => now()])->save();
    }

    public function approveBankReconciliation(BankReconciliation $reconciliation, User $user): void
    {
        $reconciliation->refresh();
        if ($reconciliation->status !== 'reviewed') {
            throw ValidationException::withMessages(['reconciliation' => 'Review the reconciliation before sign-off.']);
        }
        if ((int) $reconciliation->prepared_by === (int) $user->id || (int) $reconciliation->reviewed_by === (int) $user->id) {
            throw ValidationException::withMessages(['reconciliation' => 'Final sign-off must be completed by an independent approver.']);
        }
        if (abs((float) $reconciliation->difference) > 0.01) {
            throw ValidationException::withMessages(['reconciliation' => 'The reconciliation difference must be zero before sign-off.']);
        }
        $reconciliation->forceFill(['status' => 'signed_off', 'approved_by' => $user->id, 'approved_at' => now()])->save();
    }

    public function createInventoryControl(User $user, array $data): InventoryControl
    {
        return DB::transaction(function () use ($user, $data): InventoryControl {
            DB::table('organizations')->where('id', $user->organization_id)->lockForUpdate()->value('id');
            $sequence = InventoryControl::query()->where('organization_id', $user->organization_id)->whereYear('control_date', now()->parse($data['control_date'])->year)->count() + 1;
            $control = InventoryControl::query()->create([
                'organization_id' => $user->organization_id, 'branch_id' => $data['branch_id'],
                'control_no' => sprintf('STK-%s-%05d', now()->parse($data['control_date'])->format('Y'), $sequence),
                'control_type' => $data['control_type'], 'control_date' => $data['control_date'], 'status' => 'draft',
                'reason' => $data['reason'], 'created_by' => $user->id,
            ]);
            foreach ($data['lines'] as $input) {
                $item = CatalogItem::query()->where('organization_id', $user->organization_id)->where('track_inventory', true)->findOrFail($input['catalog_item_id']);
                $system = (float) InventoryMovement::query()->where('branch_id', $data['branch_id'])->where('catalog_item_id', $item->id)->sum('quantity');
                $counted = (float) $input['counted_quantity'];
                $delta = round($counted - $system, 4);
                $cost = (float) ($input['unit_cost'] ?? 0) ?: (float) ($item->average_cost ?: $item->default_cost);
                $control->lines()->create([
                    'catalog_item_id' => $item->id, 'system_quantity' => $system, 'counted_quantity' => $counted,
                    'quantity_delta' => $delta, 'unit_cost' => $cost, 'value_delta' => round($delta * $cost, 4),
                    'counter_account_id' => $input['counter_account_id'], 'note' => $input['note'] ?? null,
                ]);
            }

            return $control->load('lines.item');
        });
    }

    public function approveInventoryControl(InventoryControl $control, User $user): void
    {
        if ($control->status !== 'draft') {
            throw ValidationException::withMessages(['control' => 'Only draft inventory controls can be approved.']);
        }
        if ((int) $control->created_by === (int) $user->id) {
            throw ValidationException::withMessages(['control' => 'An independent checker must approve the stock adjustment.']);
        }
        $control->forceFill(['status' => 'approved', 'approved_by' => $user->id, 'approved_at' => now()])->save();
    }

    public function postInventoryControl(InventoryControl $control, User $user): void
    {
        DB::transaction(function () use ($control, $user): void {
            $control = InventoryControl::query()->lockForUpdate()->with('lines.item')->findOrFail($control->id);
            if ($control->status !== 'approved') {
                throw ValidationException::withMessages(['control' => 'Approve the inventory control before posting.']);
            }
            $inventoryFallback = GlAccount::query()->where('organization_id', $control->organization_id)->where('system_key', 'inventory')->value('id');
            $journalLines = [];
            foreach ($control->lines as $line) {
                if (abs((float) $line->value_delta) < 0.0001) {
                    continue;
                }
                $inventory = $line->item->inventory_account_id ?: $inventoryFallback;
                $value = abs((float) $line->value_delta);
                $increase = (float) $line->quantity_delta > 0;
                $journalLines[] = ['gl_account_id' => $increase ? $inventory : $line->counter_account_id, 'debit' => $value, 'credit' => 0, 'description' => $control->control_no.' '.$line->item->name];
                $journalLines[] = ['gl_account_id' => $increase ? $line->counter_account_id : $inventory, 'debit' => 0, 'credit' => $value, 'description' => $control->control_no.' '.$line->item->name];
            }
            if ($journalLines) {
                $currency = DB::table('organizations')->where('id', $control->organization_id)->value('base_currency_code') ?: 'USD';
                $journal = $this->ledger->createSystemJournal($control->organization_id, $control->branch_id, $user->id, [
                    'entry_date' => $control->control_date->toDateString(), 'journal_type' => 'inventory_adjustment', 'reference' => $control->control_no,
                    'description' => $control->reason, 'currency_code' => $currency, 'source_type' => InventoryControl::class, 'source_id' => $control->id, 'lines' => $journalLines,
                ]);
                $control->journal_entry_id = $journal?->id;
            }
            foreach ($control->lines as $line) {
                if (abs((float) $line->quantity_delta) < 0.0001) {
                    continue;
                }
                InventoryMovement::query()->create([
                    'organization_id' => $control->organization_id, 'branch_id' => $control->branch_id, 'catalog_item_id' => $line->catalog_item_id,
                    'movement_type' => $control->control_type, 'quantity' => $line->quantity_delta, 'unit_cost' => $line->unit_cost,
                    'source_type' => InventoryControl::class, 'source_id' => $control->id, 'reference' => $control->control_no,
                    'occurred_at' => $control->control_date->startOfDay(), 'created_by' => $user->id,
                ]);
                if ((float) $line->quantity_delta > 0) {
                    $oldQty = max(0, (float) $line->system_quantity);
                    $newQty = $oldQty + (float) $line->quantity_delta;
                    $weighted = $newQty > 0 ? (($oldQty * (float) $line->item->average_cost) + ((float) $line->quantity_delta * (float) $line->unit_cost)) / $newQty : (float) $line->unit_cost;
                    $line->item->forceFill(['average_cost' => round($weighted, 4)])->save();
                }
            }
            $control->forceFill(['status' => 'posted', 'posted_by' => $user->id, 'posted_at' => now()])->save();
        });
    }

    public function prepareVatReturn(User $user, array $data): VatReturn
    {
        $report = $this->taxReports->report($user, $data['from_date'], $data['to_date']);
        $summary = $report['summary'];
        $version = VatReturn::query()->where('organization_id', $user->organization_id)->whereDate('from_date', $data['from_date'])->whereDate('to_date', $data['to_date'])->max('version') + 1;
        $previous = VatReturn::query()->where('organization_id', $user->organization_id)->whereDate('from_date', $data['from_date'])->whereDate('to_date', $data['to_date'])->latest('version')->first();

        return VatReturn::query()->create([
            'organization_id' => $user->organization_id, 'previous_return_id' => $previous?->id,
            'from_date' => $data['from_date'], 'to_date' => $data['to_date'], 'currency_code' => $data['currency_code'], 'version' => $version,
            'output_tax' => $summary['output_tax'], 'input_tax' => $summary['input_tax'], 'net_tax' => $summary['net_tax'],
            'control_balance' => round((float) ($summary['control_output'] ?? 0) - (float) ($summary['control_input'] ?? 0), 4),
            'variance' => round((float) ($summary['output_variance'] ?? 0) - (float) ($summary['input_variance'] ?? 0), 4),
            'status' => 'draft', 'amendment_reason' => $data['amendment_reason'] ?? null, 'prepared_by' => $user->id,
        ]);
    }

    public function transitionVatReturn(VatReturn $return, User $user, string $status): void
    {
        $allowed = ['draft' => 'reviewed', 'reviewed' => 'approved', 'approved' => 'submitted'];
        if (($allowed[$return->status] ?? null) !== $status) {
            throw ValidationException::withMessages(['return' => 'That VAT return transition is not allowed.']);
        }
        if ((int) $return->prepared_by === (int) $user->id && in_array($status, ['reviewed', 'approved'], true)) {
            throw ValidationException::withMessages(['return' => 'The preparer cannot review or approve the VAT return.']);
        }
        if ($status === 'approved' && abs((float) $return->variance) > 0.01) {
            throw ValidationException::withMessages(['return' => 'Resolve the VAT control-account variance before approval.']);
        }
        $attributes = ['status' => $status, $status.'_by' => $user->id, $status.'_at' => now()];
        $return->forceFill($attributes)->save();
        if ($status === 'submitted') {
            AccountingPeriod::query()->whereHas('fiscalYear', fn ($query) => $query->where('organization_id', $return->organization_id))
                ->whereDate('starts_on', '<=', $return->to_date)->whereDate('ends_on', '>=', $return->from_date)
                ->where('status', 'open')->update(['status' => 'tax_locked']);
        }
    }

    public function createClose(User $user, array $data): AccountingClose
    {
        return DB::transaction(function () use ($user, $data): AccountingClose {
            $close = AccountingClose::query()->create([...$data, 'organization_id' => $user->organization_id, 'status' => 'draft', 'prepared_by' => $user->id]);
            foreach ([
                'bank_reconciled' => 'Every bank account is reconciled and signed off',
                'vat_reconciled' => 'VAT return is reconciled with no unresolved variance',
                'receivables_reconciled' => 'Trade receivables agree to the debtor ledger',
                'payables_reconciled' => 'Trade payables agree to the supplier ledger',
                'inventory_reconciled' => 'Inventory valuation agrees to the control account',
                'journals_reviewed' => 'Draft and unusual journals have been reviewed',
            ] as $key => $label) {
                $close->tasks()->create(['task_key' => $key, 'label' => $label]);
            }

            return $close->load('tasks');
        });
    }

    public function completeCloseTask(AccountingClose $close, User $user, string $key, string $evidence): void
    {
        if (! in_array($close->status, ['draft', 'reviewed'], true)) {
            throw ValidationException::withMessages(['close' => 'This close checklist is locked.']);
        }
        $task = $close->tasks()->where('task_key', $key)->firstOrFail();
        $task->forceFill(['status' => 'complete', 'evidence' => $evidence, 'completed_by' => $user->id, 'completed_at' => now()])->save();
    }

    public function reviewClose(AccountingClose $close, User $user): void
    {
        if ((int) $close->prepared_by === (int) $user->id) {
            throw ValidationException::withMessages(['close' => 'An independent checker must review the close.']);
        }
        if ($close->tasks()->where('status', '!=', 'complete')->exists()) {
            throw ValidationException::withMessages(['close' => 'Complete every close task before review.']);
        }
        $close->load(['period', 'fiscalYear']);
        $from = $close->period?->starts_on ?? $close->fiscalYear?->starts_on;
        $to = $close->period?->ends_on ?? $close->fiscalYear?->ends_on;
        if (! $from || ! $to) {
            throw ValidationException::withMessages(['close' => 'The close is not linked to a valid accounting period.']);
        }
        $openBankControls = BankReconciliation::query()->where('organization_id', $close->organization_id)
            ->whereDate('to_date', '>=', $from)->whereDate('from_date', '<=', $to)
            ->where(fn ($query) => $query->where('status', '!=', 'signed_off')->orWhereRaw('ABS(difference) > 0.01'))->exists();
        if ($openBankControls) {
            throw ValidationException::withMessages(['close' => 'Resolve and sign off every bank reconciliation in the close period.']);
        }
        $openVatControls = VatReturn::query()->where('organization_id', $close->organization_id)
            ->whereDate('to_date', '>=', $from)->whereDate('from_date', '<=', $to)
            ->where(fn ($query) => $query->where('status', '!=', 'submitted')->orWhereRaw('ABS(variance) > 0.01'))->exists();
        if ($openVatControls) {
            throw ValidationException::withMessages(['close' => 'Resolve the VAT variance and submit the return before closing.']);
        }
        if (JournalEntry::query()->where('organization_id', $close->organization_id)->where('status', 'draft')->whereBetween('entry_date', [$from, $to])->exists()) {
            throw ValidationException::withMessages(['close' => 'Post or remove every draft journal in the close period.']);
        }
        $controlReport = $this->ledger->report($user, 'control-reconciliation', $from->toDateString(), $to->toDateString(), null);
        if (collect($controlReport['rows'])->contains(fn (array $row): bool => abs((float) $row['balance']) > 0.01)) {
            throw ValidationException::withMessages(['close' => 'Debtors, creditors and inventory control accounts must reconcile before close.']);
        }
        $close->forceFill(['status' => 'reviewed', 'reviewed_by' => $user->id, 'reviewed_at' => now()])->save();
    }

    public function approveClose(AccountingClose $close, User $user): void
    {
        DB::transaction(function () use ($close, $user): void {
            $close = AccountingClose::query()->lockForUpdate()->with(['period', 'fiscalYear'])->findOrFail($close->id);
            if ($close->status !== 'reviewed') {
                throw ValidationException::withMessages(['close' => 'Review the close before approval.']);
            }
            if (in_array($user->id, [$close->prepared_by, $close->reviewed_by])) {
                throw ValidationException::withMessages(['close' => 'Final approval must be completed by a third user.']);
            }
            if ($close->close_type === 'month' && $close->period) {
                $close->period->forceFill(['status' => 'closed', 'closed_by' => $user->id, 'closed_at' => now()])->save();
            }
            if ($close->close_type === 'year' && $close->fiscalYear) {
                $journal = $this->postYearEndJournal($close, $user);
                $openingBalances = $this->rollForwardFiscalYear($close);
                $close->fiscalYear->periods()->update(['status' => 'closed', 'closed_by' => $user->id, 'closed_at' => now()]);
                $close->fiscalYear->forceFill(['status' => 'closed'])->save();
                $close->retained_earnings_journal_id = $journal?->id;
                $close->opening_balances_json = $openingBalances;
            }
            $close->forceFill(['status' => 'closed', 'approved_by' => $user->id, 'approved_at' => now()])->save();
        });
    }

    public function reopenClose(AccountingClose $close, User $user, string $reason): void
    {
        if ($close->status !== 'closed') {
            throw ValidationException::withMessages(['close' => 'Only a closed period can be reopened.']);
        }
        $close->forceFill(['status' => 'reopen_requested', 'reopen_reason' => $reason, 'reopened_by' => $user->id, 'reopened_at' => now()])->save();
    }

    public function approveReopen(AccountingClose $close, User $user): void
    {
        if ($close->status !== 'reopen_requested') {
            throw ValidationException::withMessages(['close' => 'A reopen request is required before approval.']);
        }
        if ((int) $close->reopened_by === (int) $user->id) {
            throw ValidationException::withMessages(['close' => 'A different user must approve the reopen request.']);
        }
        if ($close->period) {
            $close->period->forceFill(['status' => 'open', 'closed_by' => null, 'closed_at' => null])->save();
        }
        if ($close->close_type === 'year' && $close->fiscalYear) {
            $close->fiscalYear->forceFill(['status' => 'open'])->save();
        }
        $close->forceFill(['status' => 'reopened', 'reopen_approved_by' => $user->id, 'reopen_approved_at' => now()])->save();
    }

    private function refreshReconciliation(BankReconciliation $reconciliation): void
    {
        $reconciliation->refresh()->load('bankAccount');
        $accountId = $reconciliation->bankAccount?->gl_account_id
            ?: GlAccount::query()->where('organization_id', $reconciliation->organization_id)->where('system_key', 'bank')->value('id');
        $ledgerClosing = (float) DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_entries.organization_id', $reconciliation->organization_id)
            ->where('journal_entries.status', 'posted')
            ->where('journal_lines.gl_account_id', $accountId)
            ->whereDate('journal_entries.entry_date', '<=', $reconciliation->to_date)
            ->selectRaw('COALESCE(SUM(journal_lines.base_debit - journal_lines.base_credit), 0) balance')
            ->value('balance');
        $reconciliation->forceFill([
            'ledger_closing_balance' => round($ledgerClosing, 4),
            'difference' => round((float) $reconciliation->closing_statement_balance - $ledgerClosing, 4),
        ])->save();
    }

    private function ruleMatches(BankRule $rule, string $value): bool
    {
        $value = mb_strtolower($value);
        $pattern = mb_strtolower($rule->pattern);

        return match ($rule->match_operator) {
            'equals' => trim($value) === trim($pattern),
            'starts_with' => str_starts_with($value, $pattern),
            'ends_with' => str_ends_with($value, $pattern),
            default => str_contains($value, $pattern),
        };
    }

    private function postYearEndJournal(AccountingClose $close, User $user): ?JournalEntry
    {
        $year = $close->fiscalYear;
        $balances = DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
            ->where('journal_entries.organization_id', $close->organization_id)->where('journal_entries.status', 'posted')
            ->whereBetween('journal_entries.entry_date', [$year->starts_on, $year->ends_on])->whereIn('gl_accounts.type', ['revenue', 'expense'])
            ->selectRaw('gl_accounts.id, gl_accounts.type, SUM(journal_lines.base_debit) debit, SUM(journal_lines.base_credit) credit')->groupBy('gl_accounts.id', 'gl_accounts.type')->get();
        $retained = GlAccount::query()->where('organization_id', $close->organization_id)->where('system_key', 'retained_earnings')->value('id');
        $lines = [];
        $debits = 0.0;
        $credits = 0.0;
        foreach ($balances as $balance) {
            $net = (float) $balance->credit - (float) $balance->debit;
            if (abs($net) < 0.0001) {
                continue;
            }
            if ($net > 0) {
                $lines[] = ['gl_account_id' => $balance->id, 'debit' => $net, 'credit' => 0];
                $debits += $net;
            } else {
                $lines[] = ['gl_account_id' => $balance->id, 'debit' => 0, 'credit' => abs($net)];
                $credits += abs($net);
            }
        }
        $difference = round($debits - $credits, 4);
        if (abs($difference) < 0.0001 || ! $retained) {
            return null;
        }
        $lines[] = ['gl_account_id' => $retained, 'debit' => $difference < 0 ? abs($difference) : 0, 'credit' => $difference > 0 ? $difference : 0, 'description' => 'Transfer annual result to retained earnings'];

        return $this->ledger->createSystemJournal($close->organization_id, null, $user->id, [
            'entry_date' => $year->ends_on->toDateString(), 'journal_type' => 'year_end', 'reference' => $close->reference,
            'description' => 'Year-end close '.$year->name, 'currency_code' => DB::table('organizations')->where('id', $close->organization_id)->value('base_currency_code') ?: 'USD',
            'source_type' => AccountingClose::class, 'source_id' => $close->id, 'lines' => $lines,
        ]);
    }

    private function rollForwardFiscalYear(AccountingClose $close): array
    {
        $year = $close->fiscalYear;
        $balances = DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
            ->where('journal_entries.organization_id', $close->organization_id)
            ->where('journal_entries.status', 'posted')
            ->whereDate('journal_entries.entry_date', '<=', $year->ends_on)
            ->whereIn('gl_accounts.type', ['asset', 'liability', 'equity'])
            ->selectRaw('gl_accounts.id, gl_accounts.code, gl_accounts.name, gl_accounts.type, SUM(journal_lines.base_debit - journal_lines.base_credit) balance')
            ->groupBy('gl_accounts.id', 'gl_accounts.code', 'gl_accounts.name', 'gl_accounts.type')
            ->get()->map(fn ($row): array => ['gl_account_id' => $row->id, 'code' => $row->code, 'name' => $row->name, 'type' => $row->type, 'balance' => round((float) $row->balance, 4)])->all();

        $nextStart = Carbon::parse($year->ends_on)->addDay();
        $nextEnd = $nextStart->copy()->addYear()->subDay();
        $next = FiscalYear::query()->firstOrCreate(
            ['organization_id' => $close->organization_id, 'starts_on' => $nextStart->toDateString()],
            ['name' => 'FY '.$nextStart->format('Y'), 'ends_on' => $nextEnd->toDateString(), 'status' => 'open'],
        );
        foreach (range(1, 12) as $period) {
            $start = $nextStart->copy()->addMonths($period - 1)->startOfMonth();
            $end = $start->copy()->endOfMonth()->min($nextEnd);
            AccountingPeriod::query()->firstOrCreate(
                ['fiscal_year_id' => $next->id, 'period_number' => $period],
                ['name' => $start->format('F Y'), 'starts_on' => $start->toDateString(), 'ends_on' => $end->toDateString(), 'status' => 'open'],
            );
        }

        return ['rolled_to_fiscal_year_id' => $next->id, 'rolled_to' => $nextStart->toDateString(), 'accounts' => $balances];
    }
}
