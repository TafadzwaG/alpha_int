<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\CustomerInvoice;
use App\Models\GlAccount;
use App\Models\GoodsReceipt;
use App\Models\InventoryMovement;
use App\Models\PaymentAllocation;
use App\Models\PurchaseOrder;
use App\Models\SupplierBill;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DailyAccountingService
{
    public function __construct(private readonly GeneralLedgerService $ledger) {}

    public function postInvoice(CustomerInvoice $invoice, User $user): CustomerInvoice
    {
        return DB::transaction(function () use ($invoice, $user): CustomerInvoice {
            $invoice = CustomerInvoice::query()->lockForUpdate()->with(['lines.item', 'account'])->findOrFail($invoice->id);
            if ($invoice->status !== 'draft') {
                throw ValidationException::withMessages(['invoice' => 'Only draft invoices can be posted.']);
            }

            $system = GlAccount::query()->where('organization_id', $invoice->organization_id)
                ->whereIn('system_key', ['accounts_receivable', 'vat_output', 'inventory', 'cost_of_sales'])
                ->pluck('id', 'system_key');
            foreach (['accounts_receivable', 'vat_output', 'inventory', 'cost_of_sales'] as $key) {
                if (! isset($system[$key])) {
                    throw ValidationException::withMessages(['invoice' => "The {$key} control account is not configured."]);
                }
            }

            $journalLines = [[
                'gl_account_id' => $system['accounts_receivable'], 'client_account_id' => $invoice->client_account_id,
                'debit' => (float) $invoice->total_amount, 'credit' => 0, 'description' => "Invoice {$invoice->invoice_no}",
            ]];
            foreach ($invoice->lines as $line) {
                $journalLines[] = [
                    'gl_account_id' => $line->revenue_account_id, 'client_account_id' => $invoice->client_account_id,
                    'debit' => 0, 'credit' => (float) $line->line_subtotal, 'description' => $line->description,
                ];
                if (! $line->item?->track_inventory) {
                    continue;
                }
                $available = (float) InventoryMovement::query()->where('branch_id', $invoice->branch_id)
                    ->where('catalog_item_id', $line->catalog_item_id)->sum('quantity');
                if ($available + 0.0001 < (float) $line->quantity) {
                    throw ValidationException::withMessages(['invoice' => "Insufficient stock for {$line->item->code}. Available: {$available}."]);
                }
                $cost = round((float) $line->quantity * (float) $line->unit_cost, 4);
                if ($cost > 0) {
                    $journalLines[] = ['gl_account_id' => $line->item->cogs_account_id ?: $system['cost_of_sales'], 'debit' => $cost, 'credit' => 0, 'description' => 'Cost of '.$line->description];
                    $journalLines[] = ['gl_account_id' => $line->item->inventory_account_id ?: $system['inventory'], 'debit' => 0, 'credit' => $cost, 'description' => 'Inventory issued: '.$line->description];
                }
            }
            if ((float) $invoice->tax_amount > 0) {
                $journalLines[] = ['gl_account_id' => $system['vat_output'], 'debit' => 0, 'credit' => (float) $invoice->tax_amount, 'description' => 'Output tax'];
            }

            $charge = AccountCharge::query()->create([
                'account_id' => $invoice->client_account_id, 'charge_type' => 'customer_invoice',
                'description' => "Customer invoice {$invoice->invoice_no}", 'source_type' => CustomerInvoice::class, 'source_id' => $invoice->id,
                'amount' => $invoice->total_amount, 'currency_code' => $invoice->currency_code, 'due_date' => $invoice->due_date,
                'status' => 'draft', 'created_by' => $user->id,
            ]);
            $journal = $this->ledger->createSystemJournal($invoice->organization_id, $invoice->branch_id, $user->id, [
                'entry_date' => $invoice->invoice_date->toDateString(), 'journal_type' => 'sales', 'reference' => $invoice->invoice_no,
                'description' => $invoice->description ?: "Customer invoice {$invoice->invoice_no}", 'currency_code' => $invoice->currency_code,
                'source_type' => CustomerInvoice::class, 'source_id' => $invoice->id, 'lines' => $journalLines,
            ]);

            foreach ($invoice->lines->where(fn ($line) => $line->item?->track_inventory) as $line) {
                InventoryMovement::query()->create([
                    'organization_id' => $invoice->organization_id, 'branch_id' => $invoice->branch_id, 'catalog_item_id' => $line->catalog_item_id,
                    'movement_type' => 'sale', 'quantity' => -(float) $line->quantity, 'unit_cost' => $line->unit_cost,
                    'source_type' => CustomerInvoice::class, 'source_id' => $invoice->id, 'reference' => $invoice->invoice_no,
                    'occurred_at' => $invoice->invoice_date->startOfDay(), 'created_by' => $user->id,
                ]);
            }
            $charge->forceFill(['status' => 'posted', 'posted_at' => now()])->save();
            $invoice->forceFill(['account_charge_id' => $charge->id, 'journal_entry_id' => $journal?->id, 'status' => 'posted', 'posted_by' => $user->id, 'posted_at' => now(), 'locked_at' => now()])->save();

            return $invoice->fresh(['lines', 'charge', 'journal']);
        });
    }

    public function receiveOrder(PurchaseOrder $order, User $user, ?string $supplierReference = null): GoodsReceipt
    {
        return DB::transaction(function () use ($order, $user, $supplierReference): GoodsReceipt {
            $order = PurchaseOrder::query()->lockForUpdate()->with('lines.item')->findOrFail($order->id);
            if (! in_array($order->status, ['approved', 'part_received'], true)) {
                throw ValidationException::withMessages(['purchase_order' => 'Only approved purchase orders can be received.']);
            }
            $remaining = $order->lines->filter(fn ($line) => (float) $line->received_quantity < (float) $line->ordered_quantity);
            if ($remaining->isEmpty()) {
                throw ValidationException::withMessages(['purchase_order' => 'This purchase order is already fully received.']);
            }
            $sequence = GoodsReceipt::query()->where('organization_id', $order->organization_id)->whereYear('received_date', today()->year)->count() + 1;
            $receipt = GoodsReceipt::query()->create([
                'organization_id' => $order->organization_id, 'branch_id' => $order->branch_id, 'supplier_id' => $order->supplier_id,
                'purchase_order_id' => $order->id, 'receipt_no' => sprintf('GRN-%s-%05d', today()->format('Y'), $sequence),
                'received_date' => today(), 'supplier_reference' => $supplierReference, 'status' => 'posted', 'created_by' => $user->id,
            ]);
            foreach ($remaining as $line) {
                $quantity = round((float) $line->ordered_quantity - (float) $line->received_quantity, 4);
                $receipt->lines()->create(['purchase_order_line_id' => $line->id, 'catalog_item_id' => $line->catalog_item_id, 'quantity' => $quantity, 'unit_cost' => $line->unit_price]);
                $line->forceFill(['received_quantity' => $line->ordered_quantity])->save();
                if ($line->item?->track_inventory) {
                    InventoryMovement::query()->create([
                        'organization_id' => $order->organization_id, 'branch_id' => $order->branch_id, 'catalog_item_id' => $line->catalog_item_id,
                        'movement_type' => 'receipt', 'quantity' => $quantity, 'unit_cost' => $line->unit_price,
                        'source_type' => GoodsReceipt::class, 'source_id' => $receipt->id, 'reference' => $receipt->receipt_no,
                        'occurred_at' => now(), 'created_by' => $user->id,
                    ]);
                }
            }
            $order->forceFill(['status' => 'received'])->save();

            return $receipt->load('lines');
        });
    }

    public function createBillFromOrder(PurchaseOrder $order, User $user): SupplierBill
    {
        return DB::transaction(function () use ($order, $user): SupplierBill {
            $order->load(['lines', 'goodsReceipts', 'supplier']);
            if (! in_array($order->status, ['approved', 'part_received', 'received'], true)) {
                throw ValidationException::withMessages(['purchase_order' => 'Approve the purchase order before creating a supplier bill.']);
            }
            if ($order->bills()->exists()) {
                throw ValidationException::withMessages(['purchase_order' => 'A supplier bill already exists for this purchase order.']);
            }
            $sequence = SupplierBill::query()->where('organization_id', $order->organization_id)->whereYear('bill_date', today()->year)->count() + 1;
            $bill = SupplierBill::query()->create([
                'organization_id' => $order->organization_id, 'branch_id' => $order->branch_id, 'supplier_id' => $order->supplier_id,
                'purchase_order_id' => $order->id, 'goods_receipt_id' => $order->goodsReceipts->last()?->id,
                'bill_no' => sprintf('BILL-%s-%05d', today()->format('Y'), $sequence), 'bill_date' => today(), 'due_date' => today()->addDays($order->supplier?->payment_terms_days ?? 30),
                'currency_code' => $order->currency_code, 'subtotal' => $order->subtotal, 'tax_amount' => $order->tax_amount,
                'total_amount' => $order->total_amount, 'paid_amount' => 0, 'status' => 'draft', 'description' => "Generated from {$order->po_no}", 'created_by' => $user->id,
            ]);
            $bill->lines()->createMany($order->lines->map(fn ($line) => [
                'catalog_item_id' => $line->catalog_item_id, 'gl_account_id' => $line->gl_account_id, 'description' => $line->description,
                'quantity' => $line->ordered_quantity, 'unit_price' => $line->unit_price, 'tax_code' => $line->tax_code,
                'tax_rate' => $line->tax_rate, 'line_subtotal' => $line->line_subtotal, 'tax_amount' => $line->tax_amount, 'line_total' => $line->line_total,
            ])->all());

            return $bill;
        });
    }

    public function syncInvoiceForAllocation(PaymentAllocation $allocation): void
    {
        $charge = $allocation->charge()->first();
        if (! $charge || $charge->source_type !== CustomerInvoice::class || ! $charge->source_id) {
            return;
        }
        $invoice = CustomerInvoice::query()->find($charge->source_id);
        if (! $invoice || $invoice->status === 'draft') {
            return;
        }
        $paid = (float) PaymentAllocation::query()->where('charge_id', $charge->id)
            ->whereHas('payment', fn ($query) => $query->where('status', 'approved'))->sum('amount');
        $status = $paid >= (float) $invoice->total_amount - 0.0001 ? 'paid' : ($paid > 0 ? 'partially_paid' : 'posted');
        $invoice->forceFill(['paid_amount' => $paid, 'status' => $status])->saveQuietly();
        $charge->forceFill(['status' => $status])->saveQuietly();
    }
}
