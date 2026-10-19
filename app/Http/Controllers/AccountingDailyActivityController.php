<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\BankDeposit;
use App\Models\BankStatementImport;
use App\Models\BankStatementLine;
use App\Models\CatalogItem;
use App\Models\ClientAccount;
use App\Models\CustomerInvoice;
use App\Models\GlAccount;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\CustomerInvoiceDocument;
use App\Services\DailyAccountingService;
use App\Services\GeneralLedgerService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AccountingDailyActivityController extends Controller
{
    public function __construct(
        private readonly DailyAccountingService $daily,
        private readonly GeneralLedgerService $ledger,
        private readonly BranchAccessService $branchAccess,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $organizationId = (int) $request->user()->organization_id;
        $branchIds = $this->branchAccess->branchIds($request->user());
        $scopeBranch = fn ($query) => $query->when($branchIds !== null, fn ($inner) => $inner->whereIn('branch_id', $branchIds));
        $invoices = $scopeBranch(CustomerInvoice::query()->where('organization_id', $organizationId))
            ->with(['account.clientFile.client:id,first_name,last_name,client_no', 'branch:id,name'])->latest('invoice_date')->limit(50)->get();
        $orders = $scopeBranch(PurchaseOrder::query()->where('organization_id', $organizationId))
            ->with(['supplier:id,name,supplier_no,payment_terms_days', 'branch:id,name', 'lines', 'bills:id,purchase_order_id,bill_no,status'])->latest('order_date')->limit(50)->get();
        $statements = BankStatementImport::query()->where('organization_id', $organizationId)
            ->whereHas('bankAccount', fn ($query) => $branchIds === null ? $query : $query->whereIn('branch_id', $branchIds))
            ->with(['bankAccount:id,bank_name,account_mask', 'lines' => fn ($query) => $query->latest('transaction_date')])->latest()->limit(15)->get();
        $catalog = CatalogItem::query()->where('organization_id', $organizationId)->where('status', 'active')
            ->with(['taxCode:id,code,rate'])->withSum('inventoryMovements as stock_on_hand', 'quantity')->orderBy('name')->get();

        return Inertia::render('accounting/daily-activity', [
            'invoices' => $invoices,
            'purchaseOrders' => $orders,
            'statements' => $statements,
            'summary' => [
                'draftInvoices' => $invoices->where('status', 'draft')->count(),
                'receivables' => $invoices->whereIn('status', ['posted', 'partially_paid'])->sum(fn ($invoice) => (float) $invoice->total_amount - (float) $invoice->paid_amount),
                'openOrders' => $orders->whereIn('status', ['draft', 'approved', 'part_received'])->count(),
                'unmatchedBankLines' => $statements->sum(fn ($statement) => $statement->lines->whereNull('match_type')->count()),
            ],
            'accounts' => ClientAccount::query()->whereHas('clientFile.client', fn ($query) => $query->where('organization_id', $organizationId))
                ->when($branchIds !== null, fn ($query) => $query->whereHas('clientFile', fn ($inner) => $inner->whereIn('branch_id', $branchIds)))
                ->with('clientFile.client:id,first_name,last_name,client_no')->where('status', 'active')->get()
                ->map(fn ($account) => ['value' => (string) $account->id, 'label' => trim($account->clientFile->client->first_name.' '.$account->clientFile->client->last_name).' · '.$account->account_no, 'branch_id' => $account->clientFile->branch_id]),
            'suppliers' => Supplier::query()->where('organization_id', $organizationId)->where('status', 'active')->orderBy('name')->get(['id', 'supplier_no', 'name', 'currency_code', 'payment_terms_days']),
            'catalogItems' => $catalog->map(fn ($item) => [
                'id' => $item->id, 'code' => $item->code, 'name' => $item->name, 'type' => $item->type, 'track_inventory' => $item->track_inventory,
                'stock_on_hand' => (float) ($item->stock_on_hand ?? 0), 'default_unit_price' => (float) $item->default_unit_price,
                'default_cost' => (float) $item->default_cost, 'currency_code' => $item->currency_code, 'expense_account_id' => $item->expense_account_id,
                'revenue_account_id' => $item->revenue_account_id, 'inventory_account_id' => $item->inventory_account_id,
                'tax_code' => $item->taxCode?->code, 'tax_rate' => (float) ($item->taxCode?->rate ?? 0),
            ]),
            'branches' => $this->branchAccess->availableBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name]),
            'bankAccounts' => BankAccount::query()->where('organization_id', $organizationId)->where('active', true)
                ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))->get()
                ->map(fn ($bank) => ['value' => (string) $bank->id, 'label' => $bank->bank_name.' · '.$bank->account_mask, 'currency' => $bank->currency_code]),
            'ledgerAccounts' => GlAccount::query()->where('organization_id', $organizationId)->where('active', true)->orderBy('code')->get()->map(fn ($account) => ['value' => (string) $account->id, 'label' => $account->code.' · '.$account->name, 'type' => $account->type]),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
            'permissions' => ['manage' => $request->user()->can('accounting.manage'), 'post' => $request->user()->can('accounting.post')],
        ]);
    }

    public function storeInvoice(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'branch_id' => ['required', Rule::in($this->branchAccess->availableBranches($request->user())->pluck('id'))],
            'client_account_id' => ['required', Rule::exists('client_accounts', 'id')], 'invoice_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:invoice_date'], 'currency_code' => ['required', 'string', 'size:3'],
            'description' => ['nullable', 'string', 'max:1000'], 'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.catalog_item_id' => ['required', 'distinct', Rule::exists('catalog_items', 'id')->where('organization_id', $organizationId)->where('status', 'active')],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'], 'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);
        $account = ClientAccount::query()->whereKey($validated['client_account_id'])
            ->whereHas('clientFile.client', fn ($query) => $query->where('organization_id', $organizationId))
            ->whereHas('clientFile', fn ($query) => $query->where('branch_id', $validated['branch_id']))->firstOrFail();
        $items = CatalogItem::query()->where('organization_id', $organizationId)->whereIn('id', collect($validated['lines'])->pluck('catalog_item_id'))->with('taxCode')->get()->keyBy('id');
        $revenueFallback = GlAccount::query()->where('organization_id', $organizationId)->where('system_key', 'sales_revenue')->value('id');
        $lines = collect($validated['lines'])->map(function (array $line) use ($items, $revenueFallback): array {
            $item = $items[$line['catalog_item_id']];
            $subtotal = round((float) $line['quantity'] * (float) $line['unit_price'], 4);
            $rate = (float) ($item->taxCode?->rate ?? 0);
            $tax = round($subtotal * $rate / 100, 4);

            return ['catalog_item_id' => $item->id, 'revenue_account_id' => $item->revenue_account_id ?: $revenueFallback, 'description' => $item->name,
                'quantity' => $line['quantity'], 'unit_price' => $line['unit_price'], 'unit_cost' => $item->default_cost, 'tax_code' => $item->taxCode?->code,
                'tax_rate' => $rate, 'line_subtotal' => $subtotal, 'tax_amount' => $tax, 'line_total' => $subtotal + $tax];
        });
        if (! $revenueFallback || $lines->contains(fn ($line) => ! $line['revenue_account_id'])) {
            throw ValidationException::withMessages(['lines' => 'Configure a sales revenue account before invoicing.']);
        }
        $invoice = DB::transaction(function () use ($request, $organizationId, $validated, $account, $lines): CustomerInvoice {
            DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->value('id');
            $sequence = CustomerInvoice::query()->where('organization_id', $organizationId)->whereYear('invoice_date', Carbon::parse($validated['invoice_date'])->year)->count() + 1;
            $invoice = CustomerInvoice::query()->create([
                ...collect($validated)->except('lines')->all(), 'organization_id' => $organizationId, 'client_account_id' => $account->id,
                'invoice_no' => sprintf('INV-%s-%05d', Carbon::parse($validated['invoice_date'])->format('Y'), $sequence),
                'subtotal' => $lines->sum('line_subtotal'), 'tax_amount' => $lines->sum('tax_amount'), 'total_amount' => $lines->sum('line_total'),
                'paid_amount' => 0, 'status' => 'draft', 'created_by' => $request->user()->id,
            ]);
            $invoice->lines()->createMany($lines->all());

            return $invoice;
        });
        $this->audit->record($request, 'accounting.customer-invoice-created', $invoice, null, ['invoice_no' => $invoice->invoice_no, 'total' => (float) $invoice->total_amount]);

        return back()->with('success', "Invoice {$invoice->invoice_no} saved as draft.");
    }

    public function postInvoice(CustomerInvoice $customerInvoice, Request $request): RedirectResponse
    {
        $this->authorizeBranchDocument($customerInvoice, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        $this->daily->postInvoice($customerInvoice, $request->user());
        $this->audit->record($request, 'accounting.customer-invoice-posted', $customerInvoice, ['status' => 'draft'], ['status' => 'posted']);

        return back()->with('success', "Invoice {$customerInvoice->invoice_no} posted to receivables and the general ledger.");
    }

    public function invoicePdf(CustomerInvoice $customerInvoice, Request $request, CustomerInvoiceDocument $document): HttpResponse
    {
        $this->authorizeBranchDocument($customerInvoice, $request);
        $data = $document->data($customerInvoice);

        return Pdf::loadView('reports.customer-invoice', $data)
            ->setPaper('a4')
            ->stream($customerInvoice->invoice_no.'.pdf');
    }

    public function storePurchaseOrder(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'branch_id' => ['required', Rule::in($this->branchAccess->availableBranches($request->user())->pluck('id'))],
            'supplier_id' => ['required', Rule::exists('suppliers', 'id')->where('organization_id', $organizationId)->where('status', 'active')],
            'order_date' => ['required', 'date'], 'expected_date' => ['nullable', 'date', 'after_or_equal:order_date'], 'currency_code' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:1000'], 'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.catalog_item_id' => ['required', 'distinct', Rule::exists('catalog_items', 'id')->where('organization_id', $organizationId)->where('status', 'active')],
            'lines.*.ordered_quantity' => ['required', 'numeric', 'gt:0'], 'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);
        $items = CatalogItem::query()->where('organization_id', $organizationId)->whereIn('id', collect($validated['lines'])->pluck('catalog_item_id'))->with('taxCode')->get()->keyBy('id');
        $expenseFallback = GlAccount::query()->where('organization_id', $organizationId)->where('system_key', 'operating_expense')->value('id');
        $inventoryFallback = GlAccount::query()->where('organization_id', $organizationId)->where('system_key', 'inventory')->value('id');
        $lines = collect($validated['lines'])->map(function (array $line) use ($items, $expenseFallback, $inventoryFallback): array {
            $item = $items[$line['catalog_item_id']];
            $subtotal = round((float) $line['ordered_quantity'] * (float) $line['unit_price'], 4);
            $rate = (float) ($item->taxCode?->rate ?? 0);
            $tax = round($subtotal * $rate / 100, 4);

            return ['catalog_item_id' => $item->id, 'gl_account_id' => $item->track_inventory ? ($item->inventory_account_id ?: $inventoryFallback) : ($item->expense_account_id ?: $expenseFallback),
                'description' => $item->name, 'ordered_quantity' => $line['ordered_quantity'], 'received_quantity' => 0, 'unit_price' => $line['unit_price'],
                'tax_code' => $item->taxCode?->code, 'tax_rate' => $rate, 'line_subtotal' => $subtotal, 'tax_amount' => $tax, 'line_total' => $subtotal + $tax];
        });
        if ($lines->contains(fn ($line) => ! $line['gl_account_id'])) {
            throw ValidationException::withMessages(['lines' => 'Configure purchasing ledger accounts before ordering.']);
        }
        $order = DB::transaction(function () use ($request, $organizationId, $validated, $lines): PurchaseOrder {
            DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->value('id');
            $sequence = PurchaseOrder::query()->where('organization_id', $organizationId)->whereYear('order_date', Carbon::parse($validated['order_date'])->year)->count() + 1;
            $order = PurchaseOrder::query()->create([...collect($validated)->except('lines')->all(), 'organization_id' => $organizationId,
                'po_no' => sprintf('PO-%s-%05d', Carbon::parse($validated['order_date'])->format('Y'), $sequence), 'subtotal' => $lines->sum('line_subtotal'),
                'tax_amount' => $lines->sum('tax_amount'), 'total_amount' => $lines->sum('line_total'), 'status' => 'draft', 'created_by' => $request->user()->id]);
            $order->lines()->createMany($lines->all());

            return $order;
        });
        $this->audit->record($request, 'accounting.purchase-order-created', $order, null, ['po_no' => $order->po_no, 'total' => (float) $order->total_amount]);

        return back()->with('success', "Purchase order {$order->po_no} created.");
    }

    public function approvePurchaseOrder(PurchaseOrder $purchaseOrder, Request $request): RedirectResponse
    {
        $this->authorizeBranchDocument($purchaseOrder, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        if ($purchaseOrder->status !== 'draft') {
            throw ValidationException::withMessages(['purchase_order' => 'Only draft purchase orders can be approved.']);
        }
        $purchaseOrder->forceFill(['status' => 'approved', 'approved_by' => $request->user()->id, 'approved_at' => now()])->save();
        $this->audit->record($request, 'accounting.purchase-order-approved', $purchaseOrder, ['status' => 'draft'], ['status' => 'approved']);

        return back()->with('success', "Purchase order {$purchaseOrder->po_no} approved.");
    }

    public function receivePurchaseOrder(PurchaseOrder $purchaseOrder, Request $request): RedirectResponse
    {
        $this->authorizeBranchDocument($purchaseOrder, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        $validated = $request->validate(['supplier_reference' => ['nullable', 'string', 'max:100']]);
        $receipt = $this->daily->receiveOrder($purchaseOrder, $request->user(), $validated['supplier_reference'] ?? null);
        $this->audit->record($request, 'accounting.goods-receipt-posted', $receipt, null, ['purchase_order_id' => $purchaseOrder->id]);

        return back()->with('success', "Goods receipt {$receipt->receipt_no} posted and stock updated.");
    }

    public function billPurchaseOrder(PurchaseOrder $purchaseOrder, Request $request): RedirectResponse
    {
        $this->authorizeBranchDocument($purchaseOrder, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $bill = $this->daily->createBillFromOrder($purchaseOrder, $request->user());
        $this->audit->record($request, 'accounting.supplier-bill-created-from-order', $bill, null, ['purchase_order_id' => $purchaseOrder->id]);

        return back()->with('success', "Supplier bill {$bill->bill_no} created from {$purchaseOrder->po_no}.");
    }

    public function importBankStatement(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'bank_account_id' => ['required', Rule::exists('bank_accounts', 'id')->where('organization_id', $organizationId)],
            'statement_no' => ['required', 'string', 'max:60'], 'from_date' => ['required', 'date'], 'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'currency_code' => ['required', 'string', 'size:3'], 'statement' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);
        $bank = BankAccount::query()->where('organization_id', $organizationId)->findOrFail($validated['bank_account_id']);
        abort_unless($this->branchAccess->canAccess($request->user(), $bank->branch_id), 404);
        $handle = fopen($validated['statement']->getRealPath(), 'r');
        $headers = array_map(fn ($value) => Str::snake(trim((string) $value)), fgetcsv($handle) ?: []);
        foreach (['date', 'description', 'amount'] as $required) {
            if (! in_array($required, $headers, true)) {
                throw ValidationException::withMessages(['statement' => 'CSV headers must include date, description and amount. Optional: reference, balance.']);
            }
        }
        $rows = [];
        while (($values = fgetcsv($handle)) !== false) {
            if (count($values) !== count($headers)) {
                continue;
            }
            $row = array_combine($headers, $values);
            $date = Carbon::parse($row['date'])->toDateString();
            $amount = (float) str_replace([',', ' '], '', $row['amount']);
            $rows[] = ['transaction_date' => $date, 'reference' => trim($row['reference'] ?? '') ?: null, 'description' => trim($row['description']), 'amount' => $amount,
                'balance' => isset($row['balance']) && trim($row['balance']) !== '' ? (float) str_replace([',', ' '], '', $row['balance']) : null,
                'line_hash' => hash('sha256', implode('|', [$date, $row['reference'] ?? '', $row['description'], number_format($amount, 4, '.', '')]))];
        }
        fclose($handle);
        if (! $rows) {
            throw ValidationException::withMessages(['statement' => 'The statement contains no readable transaction rows.']);
        }
        $statement = DB::transaction(function () use ($request, $organizationId, $validated, $rows): BankStatementImport {
            $statement = BankStatementImport::query()->create([...collect($validated)->except('statement')->all(), 'organization_id' => $organizationId,
                'original_filename' => $validated['statement']->getClientOriginalName(), 'status' => 'imported', 'created_by' => $request->user()->id]);
            $statement->lines()->createMany($rows);

            return $statement;
        });
        $this->audit->record($request, 'accounting.bank-statement-imported', $statement, null, ['rows' => count($rows)]);

        return back()->with('success', count($rows).' bank transactions imported.');
    }

    public function autoMatch(BankStatementImport $bankStatementImport, Request $request): RedirectResponse
    {
        $this->authorizeStatement($bankStatementImport, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $bankStatementImport->load('bankAccount');
        $matched = 0;
        foreach ($bankStatementImport->lines()->whereNull('match_type')->get() as $line) {
            $dateFrom = $line->transaction_date->copy()->subDays(3);
            $dateTo = $line->transaction_date->copy()->addDays(3);
            $candidate = null;
            if ((float) $line->amount > 0) {
                $candidate = Payment::query()->where('branch_id', $bankStatementImport->bankAccount->branch_id)->where('status', 'approved')
                    ->whereBetween('received_at', [$dateFrom->startOfDay(), $dateTo->endOfDay()])->where('amount', abs((float) $line->amount))->first()
                    ?? BankDeposit::query()->where('bank_account_id', $bankStatementImport->bank_account_id)->whereBetween('deposit_date', [$dateFrom, $dateTo])->where('amount', abs((float) $line->amount))->first();
            } else {
                $candidate = SupplierPayment::query()->whereHas('bill', fn ($query) => $query->where('organization_id', $bankStatementImport->organization_id))
                    ->whereBetween('payment_date', [$dateFrom, $dateTo])->where('amount', abs((float) $line->amount))->first();
            }
            if ($candidate) {
                $line->forceFill(['match_type' => $candidate::class, 'match_id' => $candidate->id, 'matched_at' => now(), 'matched_by' => $request->user()->id])->save();
                $matched++;
            }
        }
        $bankStatementImport->forceFill(['status' => $bankStatementImport->lines()->whereNull('match_type')->exists() ? 'partially_matched' : 'matched'])->save();

        return back()->with('success', "{$matched} bank transactions matched to system records.");
    }

    public function postBankLine(BankStatementLine $bankStatementLine, Request $request): RedirectResponse
    {
        $bankStatementLine->load('statement.bankAccount');
        $this->authorizeStatement($bankStatementLine->statement, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        if ($bankStatementLine->match_type) {
            throw ValidationException::withMessages(['line' => 'This statement line is already matched or posted.']);
        }
        $validated = $request->validate(['counter_account_id' => ['required', Rule::exists('gl_accounts', 'id')->where('organization_id', $bankStatementLine->statement->organization_id)->where('active', true)]]);
        $bankGl = GlAccount::query()->where('organization_id', $bankStatementLine->statement->organization_id)->where('system_key', 'bank')->value('id');
        $amount = abs((float) $bankStatementLine->amount);
        $incoming = (float) $bankStatementLine->amount > 0;
        $journal = $this->ledger->createSystemJournal($bankStatementLine->statement->organization_id, $bankStatementLine->statement->bankAccount->branch_id, $request->user()->id, [
            'entry_date' => $bankStatementLine->transaction_date->toDateString(), 'journal_type' => 'bank_statement', 'reference' => $bankStatementLine->reference,
            'description' => $bankStatementLine->description, 'currency_code' => $bankStatementLine->statement->currency_code,
            'source_type' => BankStatementLine::class, 'source_id' => $bankStatementLine->id,
            'lines' => [
                ['gl_account_id' => $incoming ? $bankGl : $validated['counter_account_id'], 'debit' => $amount, 'credit' => 0],
                ['gl_account_id' => $incoming ? $validated['counter_account_id'] : $bankGl, 'debit' => 0, 'credit' => $amount],
            ],
        ]);
        $bankStatementLine->forceFill(['match_type' => JournalEntry::class, 'match_id' => $journal?->id, 'matched_at' => now(), 'matched_by' => $request->user()->id])->save();

        return back()->with('success', 'Bank transaction posted to the general ledger.');
    }

    private function authorizeBranchDocument($document, Request $request): void
    {
        abort_unless((int) $document->organization_id === (int) $request->user()->organization_id && $this->branchAccess->canAccess($request->user(), (int) $document->branch_id), 404);
    }

    private function authorizeStatement(BankStatementImport $statement, Request $request): void
    {
        $statement->loadMissing('bankAccount');
        abort_unless((int) $statement->organization_id === (int) $request->user()->organization_id && $this->branchAccess->canAccess($request->user(), (int) $statement->bankAccount->branch_id), 404);
    }
}
