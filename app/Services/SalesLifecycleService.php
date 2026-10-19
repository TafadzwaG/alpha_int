<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\AccountingApprovalLimit;
use App\Models\CatalogItem;
use App\Models\GlAccount;
use App\Models\InventoryMovement;
use App\Models\Organization;
use App\Models\SalesDocument;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesLifecycleService
{
    public function __construct(
        private readonly GeneralLedgerService $ledger,
        private readonly CurrencyConversionService $currency,
    ) {}

    public function create(User $user, array $data): SalesDocument
    {
        return DB::transaction(function () use ($user, $data): SalesDocument {
            $items = CatalogItem::query()
                ->where('organization_id', $user->organization_id)
                ->whereIn('id', collect($data['lines'])->pluck('catalog_item_id'))
                ->with('taxCode')
                ->get()->keyBy('id');
            $fallback = GlAccount::query()->where('organization_id', $user->organization_id)->where('system_key', 'sales_revenue')->value('id');
            $documentDiscountRate = round((float) ($data['document_discount_rate'] ?? 0), 4);
            $lines = collect($data['lines'])->map(function (array $input) use ($items, $fallback, $documentDiscountRate): array {
                $item = $items->get($input['catalog_item_id']);
                if (! $item) {
                    throw ValidationException::withMessages(['lines' => 'One or more catalogue items are invalid.']);
                }
                $gross = round((float) $input['quantity'] * (float) $input['unit_price'], 4);
                $discountRate = round((float) ($input['discount_rate'] ?? 0), 4);
                $lineDiscount = round($gross * $discountRate / 100, 4);
                $afterLineDiscount = $gross - $lineDiscount;
                $documentDiscount = round($afterLineDiscount * $documentDiscountRate / 100, 4);
                $taxable = round($afterLineDiscount - $documentDiscount, 4);
                $taxRate = (float) ($item->taxCode?->rate ?? 0);
                $tax = round($taxable * $taxRate / 100, 4);

                return [
                    'catalog_item_id' => $item->id,
                    'revenue_account_id' => $item->revenue_account_id ?: $fallback,
                    'description' => $input['description'] ?? $item->name,
                    'quantity' => round((float) $input['quantity'], 4),
                    'unit_price' => round((float) $input['unit_price'], 4),
                    'unit_cost' => (float) ($item->average_cost ?: $item->default_cost),
                    'discount_rate' => $discountRate,
                    'discount_amount' => $lineDiscount,
                    'tax_code' => $item->taxCode?->code,
                    'tax_rate' => $taxRate,
                    'line_subtotal' => $taxable,
                    'tax_amount' => $tax,
                    'line_total' => $taxable + $tax,
                ];
            });
            if (! $fallback || $lines->contains(fn (array $line): bool => ! $line['revenue_account_id'])) {
                throw ValidationException::withMessages(['lines' => 'Configure a revenue account before creating sales documents.']);
            }

            DB::table('organizations')->where('id', $user->organization_id)->lockForUpdate()->value('id');
            $date = Carbon::parse($data['document_date']);
            $type = $data['document_type'];
            $prefix = match ($type) {
                'quotation' => 'QUO', 'sales_order' => 'SO', 'delivery_note' => 'DN', 'invoice' => 'INV',
                'credit_note' => 'CRN', 'debit_note' => 'DBN', 'sales_return' => 'RTN', 'refund' => 'RFD',
                default => 'DOC',
            };
            $sequence = SalesDocument::query()->where('organization_id', $user->organization_id)
                ->where('document_type', $type)->whereYear('document_date', $date->year)->count() + 1;
            $lineDiscount = (float) $lines->sum('discount_amount');
            $subtotal = (float) collect($data['lines'])->sum(fn (array $line): float => (float) $line['quantity'] * (float) $line['unit_price']);
            $documentDiscount = round(($subtotal - $lineDiscount) * $documentDiscountRate / 100, 4);
            $document = SalesDocument::query()->create([
                ...collect($data)->except('lines')->all(),
                'organization_id' => $user->organization_id,
                'document_no' => sprintf('%s-%s-%05d', $prefix, $date->format('Y'), $sequence),
                'exchange_rate' => $this->exchangeRate((int) $user->organization_id, $data['currency_code'], $date->toDateString()),
                'subtotal' => $subtotal,
                'line_discount_total' => $lineDiscount,
                'document_discount_amount' => $documentDiscount,
                'tax_amount' => $lines->sum('tax_amount'),
                'total_amount' => $lines->sum('line_total'),
                'status' => 'draft',
                'created_by' => $user->id,
            ]);
            $document->lines()->createMany($lines->all());

            return $document->load('lines.item');
        });
    }

    public function submit(SalesDocument $document, User $user): SalesDocument
    {
        if ($document->status !== 'draft') {
            throw ValidationException::withMessages(['document' => 'Only draft documents can be submitted.']);
        }
        $document->forceFill(['status' => 'submitted', 'submitted_by' => $user->id, 'submitted_at' => now()])->save();

        return $document;
    }

    public function approve(SalesDocument $document, User $user): SalesDocument
    {
        if ($document->status !== 'submitted') {
            throw ValidationException::withMessages(['document' => 'Submit the document before approval.']);
        }
        if ((int) $document->created_by === (int) $user->id) {
            throw ValidationException::withMessages(['document' => 'Maker-checker control requires another user to approve this document.']);
        }
        $this->assertApprovalLimit($document, $user);
        $document->forceFill(['status' => 'approved', 'approved_by' => $user->id, 'approved_at' => now()])->save();

        return $document;
    }

    public function convert(SalesDocument $source, User $user, string $targetType): SalesDocument
    {
        $allowed = [
            'quotation' => ['sales_order'],
            'sales_order' => ['delivery_note', 'invoice'],
            'delivery_note' => ['invoice', 'sales_return'],
            'invoice' => ['credit_note', 'debit_note', 'refund', 'sales_return'],
        ];
        if (! in_array($targetType, $allowed[$source->document_type] ?? [], true)) {
            throw ValidationException::withMessages(['target_type' => 'That document conversion is not allowed.']);
        }
        if (! in_array($source->status, ['approved', 'posted'], true)) {
            throw ValidationException::withMessages(['document' => 'Approve or post the source document before conversion.']);
        }
        $source->load('lines');
        $copy = $this->create($user, [
            'branch_id' => $source->branch_id,
            'client_account_id' => $source->client_account_id,
            'parent_id' => $source->id,
            'accounting_dimension_id' => $source->accounting_dimension_id,
            'document_type' => $targetType,
            'document_date' => today()->toDateString(),
            'due_date' => in_array($targetType, SalesDocument::POSTING_TYPES, true) ? today()->addDays(30)->toDateString() : null,
            'currency_code' => $source->currency_code,
            'document_discount_rate' => (float) $source->document_discount_rate,
            'description' => "Converted from {$source->document_no}",
            'is_recurring' => false,
            'lines' => $source->lines->map(fn ($line): array => [
                'catalog_item_id' => $line->catalog_item_id,
                'description' => $line->description,
                'quantity' => (float) $line->quantity,
                'unit_price' => (float) $line->unit_price,
                'discount_rate' => (float) $line->discount_rate,
            ])->all(),
        ]);
        $source->forceFill(['status' => 'converted'])->save();

        return $copy;
    }

    public function post(SalesDocument $document, User $user): SalesDocument
    {
        return DB::transaction(function () use ($document, $user): SalesDocument {
            $document = SalesDocument::query()->lockForUpdate()->with(['lines.item', 'account'])->findOrFail($document->id);
            if ($document->status !== 'approved') {
                throw ValidationException::withMessages(['document' => 'Only approved documents can be posted.']);
            }
            if (! in_array($document->document_type, SalesDocument::POSTING_TYPES, true)) {
                $document->forceFill(['status' => 'posted', 'posted_by' => $user->id, 'posted_at' => now()])->save();

                return $document;
            }

            $accounts = GlAccount::query()->where('organization_id', $document->organization_id)
                ->whereIn('system_key', ['accounts_receivable', 'vat_output', 'inventory', 'cost_of_sales', 'bank'])
                ->pluck('id', 'system_key');
            foreach (['accounts_receivable', 'vat_output', 'inventory', 'cost_of_sales', 'bank'] as $key) {
                if (! isset($accounts[$key])) {
                    throw ValidationException::withMessages(['document' => "The {$key} control account is not configured."]);
                }
            }

            $lines = [];
            $isCredit = in_array($document->document_type, ['credit_note', 'sales_return'], true);
            if ($document->document_type === 'refund') {
                $lines[] = $this->journalLine($accounts['accounts_receivable'], $document, (float) $document->total_amount, 0, 'Customer refund settlement');
                $lines[] = $this->journalLine($accounts['bank'], $document, 0, (float) $document->total_amount, 'Customer refund paid');
            } else {
                $lines[] = $this->journalLine($accounts['accounts_receivable'], $document, $isCredit ? 0 : (float) $document->total_amount, $isCredit ? (float) $document->total_amount : 0, $document->document_no);
                foreach ($document->lines as $line) {
                    $lines[] = $this->journalLine($line->revenue_account_id, $document, $isCredit ? (float) $line->line_subtotal : 0, $isCredit ? 0 : (float) $line->line_subtotal, $line->description);
                }
                if ((float) $document->tax_amount > 0) {
                    $lines[] = $this->journalLine($accounts['vat_output'], $document, $isCredit ? (float) $document->tax_amount : 0, $isCredit ? 0 : (float) $document->tax_amount, 'Output VAT');
                }
            }

            if (in_array($document->document_type, ['invoice', 'credit_note', 'sales_return'], true)) {
                foreach ($document->lines as $line) {
                    if (! $line->item?->track_inventory) {
                        continue;
                    }
                    $quantity = (float) $line->quantity;
                    $returning = in_array($document->document_type, ['credit_note', 'sales_return'], true);
                    $available = (float) InventoryMovement::query()->where('branch_id', $document->branch_id)->where('catalog_item_id', $line->catalog_item_id)->sum('quantity');
                    if (! $returning && $available + 0.0001 < $quantity) {
                        throw ValidationException::withMessages(['document' => "Insufficient stock for {$line->item->code}. Available: {$available}."]);
                    }
                    $cost = round($quantity * (float) ($line->item->average_cost ?: $line->unit_cost), 4);
                    if ($cost > 0) {
                        $lines[] = $this->journalLine($line->item->cogs_account_id ?: $accounts['cost_of_sales'], $document, $returning ? 0 : $cost, $returning ? $cost : 0, 'Cost of '.$line->description);
                        $lines[] = $this->journalLine($line->item->inventory_account_id ?: $accounts['inventory'], $document, $returning ? $cost : 0, $returning ? 0 : $cost, 'Inventory '.$line->description);
                    }
                }
            }

            $journal = $this->ledger->createSystemJournal($document->organization_id, $document->branch_id, $user->id, [
                'entry_date' => $document->document_date->toDateString(),
                'journal_type' => $document->document_type,
                'reference' => $document->document_no,
                'description' => $document->description ?: str($document->document_type)->headline().' '.$document->document_no,
                'currency_code' => $document->currency_code,
                'exchange_rate' => $document->exchange_rate,
                'source_type' => SalesDocument::class,
                'source_id' => $document->id,
                'lines' => $lines,
            ]);

            $chargeAmount = $isCredit ? -(float) $document->total_amount : (float) $document->total_amount;
            $charge = AccountCharge::query()->create([
                'account_id' => $document->client_account_id,
                'charge_type' => $document->document_type,
                'description' => str($document->document_type)->headline().' '.$document->document_no,
                'source_type' => SalesDocument::class,
                'source_id' => $document->id,
                'amount' => $chargeAmount,
                'currency_code' => $document->currency_code,
                'due_date' => $document->due_date,
                'status' => 'posted',
                'posted_at' => now(),
                'created_by' => $user->id,
            ]);

            foreach ($document->lines as $line) {
                if (! $line->item?->track_inventory || ! in_array($document->document_type, ['invoice', 'credit_note', 'sales_return'], true)) {
                    continue;
                }
                $returning = in_array($document->document_type, ['credit_note', 'sales_return'], true);
                InventoryMovement::query()->create([
                    'organization_id' => $document->organization_id,
                    'branch_id' => $document->branch_id,
                    'catalog_item_id' => $line->catalog_item_id,
                    'movement_type' => $returning ? 'sales_return' : 'sale',
                    'quantity' => ($returning ? 1 : -1) * (float) $line->quantity,
                    'unit_cost' => $line->item->average_cost ?: $line->unit_cost,
                    'source_type' => SalesDocument::class,
                    'source_id' => $document->id,
                    'reference' => $document->document_no,
                    'occurred_at' => $document->document_date->startOfDay(),
                    'created_by' => $user->id,
                ]);
            }
            $document->forceFill(['journal_entry_id' => $journal?->id, 'account_charge_id' => $charge->id, 'status' => 'posted', 'posted_by' => $user->id, 'posted_at' => now()])->save();

            return $document->fresh(['lines', 'journal']);
        });
    }

    public function generateRecurring(User $user): int
    {
        $generated = 0;
        SalesDocument::query()->where('organization_id', $user->organization_id)->where('is_recurring', true)
            ->whereIn('document_type', ['invoice', 'debit_note'])->whereDate('next_run_on', '<=', today())->with('lines')->each(function (SalesDocument $template) use ($user, &$generated): void {
                $this->create($user, [
                    'branch_id' => $template->branch_id, 'client_account_id' => $template->client_account_id,
                    'accounting_dimension_id' => $template->accounting_dimension_id, 'parent_id' => $template->id,
                    'document_type' => $template->document_type, 'document_date' => today()->toDateString(), 'due_date' => today()->addDays(30)->toDateString(),
                    'currency_code' => $template->currency_code, 'document_discount_rate' => $template->document_discount_rate,
                    'description' => 'Recurring '.$template->description, 'is_recurring' => false,
                    'lines' => $template->lines->map(fn ($line): array => ['catalog_item_id' => $line->catalog_item_id, 'description' => $line->description, 'quantity' => $line->quantity, 'unit_price' => $line->unit_price, 'discount_rate' => $line->discount_rate])->all(),
                ]);
                $template->forceFill(['next_run_on' => match ($template->recurrence_pattern) {
                    'weekly' => $template->next_run_on->addWeek(), 'quarterly' => $template->next_run_on->addQuarter(), 'annual' => $template->next_run_on->addYear(), default => $template->next_run_on->addMonth(),
                }])->save();
                $generated++;
            });

        return $generated;
    }

    private function exchangeRate(int $organizationId, string $currency, string $date): float
    {
        $base = Organization::query()->whereKey($organizationId)->value('base_currency_code') ?: 'USD';

        return $currency === $base ? 1.0 : $this->currency->convert(1, $currency, $base, $date);
    }

    private function journalLine(int $accountId, SalesDocument $document, float $debit, float $credit, string $description): array
    {
        return ['gl_account_id' => $accountId, 'client_account_id' => $document->client_account_id, 'accounting_dimension_id' => $document->accounting_dimension_id, 'debit' => $debit, 'credit' => $credit, 'description' => $description];
    }

    private function assertApprovalLimit(SalesDocument $document, User $user): void
    {
        $limits = AccountingApprovalLimit::query()->where('organization_id', $document->organization_id)
            ->where('transaction_type', $document->document_type)->where('active', true)
            ->where(fn ($query) => $query->where('user_id', $user->id)->orWhereIn('role_name', $user->getRoleNames()))->get();
        if ($limits->isEmpty()) {
            return;
        }
        $allowed = $limits->contains(fn (AccountingApprovalLimit $limit): bool => (float) $document->total_amount >= (float) $limit->minimum_amount
            && ($limit->maximum_amount === null || (float) $document->total_amount <= (float) $limit->maximum_amount));
        if (! $allowed) {
            throw ValidationException::withMessages(['document' => 'This amount exceeds your configured approval authority.']);
        }
    }
}
