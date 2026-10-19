<?php

namespace App\Http\Controllers;

use App\Models\AccountingApprovalLimit;
use App\Models\AccountingAttachment;
use App\Models\AccountingBudget;
use App\Models\AccountingClose;
use App\Models\AccountingDimension;
use App\Models\AccountingPeriod;
use App\Models\BankAccount;
use App\Models\BankReconciliation;
use App\Models\BankReconciliationItem;
use App\Models\BankRule;
use App\Models\BankStatementImport;
use App\Models\CatalogItem;
use App\Models\ClientAccount;
use App\Models\FiscalYear;
use App\Models\GlAccount;
use App\Models\InventoryControl;
use App\Models\SalesDocument;
use App\Models\VatReturn;
use App\Services\AccountingControlService;
use App\Services\AuditLogger;
use App\Services\BankReconciliationWorkbook;
use App\Services\BranchAccessService;
use App\Services\SalesLifecycleService;
use App\Services\TaxReportService;
use App\Services\TaxReportWorkbook;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountingControlCentreController extends Controller
{
    public function __construct(
        private readonly SalesLifecycleService $sales,
        private readonly AccountingControlService $controls,
        private readonly BranchAccessService $branchAccess,
        private readonly AuditLogger $audit,
        private readonly TaxReportService $taxReports,
    ) {}

    public function index(Request $request): Response
    {
        $organizationId = (int) $request->user()->organization_id;
        $branchIds = $this->branchAccess->branchIds($request->user());
        $documents = SalesDocument::query()->where('organization_id', $organizationId)
            ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))
            ->with(['account.clientFile.client:id,first_name,last_name,client_no', 'branch:id,name', 'dimension:id,kind,code,name'])
            ->latest('document_date')->latest('id')->limit(75)->get();
        $reconciliations = BankReconciliation::query()->where('organization_id', $organizationId)
            ->with(['bankAccount:id,bank_name,account_mask,currency_code', 'items.statementLine', 'items.journal:id,journal_no,reference'])->latest('to_date')->limit(50)->get();
        $inventory = InventoryControl::query()->where('organization_id', $organizationId)
            ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))
            ->with(['branch:id,name', 'lines.item:id,code,name'])->latest('control_date')->limit(50)->get();
        $closes = AccountingClose::query()->where('organization_id', $organizationId)
            ->with(['tasks', 'period:id,name,starts_on,ends_on,status', 'fiscalYear:id,name,starts_on,ends_on,status'])
            ->latest()->limit(30)->get();
        $dimensions = AccountingDimension::query()->where('organization_id', $organizationId)->orderBy('kind')->orderBy('code')->get();
        $budgets = AccountingBudget::query()->where('organization_id', $organizationId)
            ->with(['account:id,code,name,type', 'dimension:id,kind,code,name', 'fiscalYear:id,name'])->orderBy('period_number')->get();

        $inventoryItems = CatalogItem::query()->where('organization_id', $organizationId)->where('track_inventory', true)
            ->select('catalog_items.*')
            ->selectSub(DB::table('inventory_movements')->selectRaw('COALESCE(SUM(quantity), 0)')
                ->whereColumn('catalog_item_id', 'catalog_items.id')->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds)), 'stock_on_hand')
            ->selectSub(DB::table('sales_document_lines')->join('sales_documents', 'sales_documents.id', '=', 'sales_document_lines.sales_document_id')
                ->selectRaw('COALESCE(SUM(sales_document_lines.quantity), 0)')->whereColumn('sales_document_lines.catalog_item_id', 'catalog_items.id')
                ->whereIn('sales_documents.document_type', ['sales_order', 'delivery_note'])->whereIn('sales_documents.status', ['approved', 'posted'])
                ->when($branchIds !== null, fn ($query) => $query->whereIn('sales_documents.branch_id', $branchIds)), 'committed_quantity')
            ->selectSub(DB::table('purchase_order_lines')->join('purchase_orders', 'purchase_orders.id', '=', 'purchase_order_lines.purchase_order_id')
                ->selectRaw('COALESCE(SUM(purchase_order_lines.ordered_quantity - purchase_order_lines.received_quantity), 0)')
                ->whereColumn('purchase_order_lines.catalog_item_id', 'catalog_items.id')->whereIn('purchase_orders.status', ['approved', 'part_received'])
                ->when($branchIds !== null, fn ($query) => $query->whereIn('purchase_orders.branch_id', $branchIds)), 'on_order_quantity')
            ->orderBy('name')->get();

        return Inertia::render('accounting/control-centre', [
            'summary' => [
                'draft_documents' => $documents->where('status', 'draft')->count(),
                'documents_awaiting_approval' => $documents->where('status', 'submitted')->count(),
                'open_reconciliations' => $reconciliations->whereNotIn('status', ['signed_off'])->count(),
                'stock_exceptions' => $inventoryItems->filter(fn ($item) => (float) ($item->stock_on_hand ?? 0) <= (float) $item->reorder_level)->count(),
                'draft_vat_returns' => VatReturn::query()->where('organization_id', $organizationId)->whereIn('status', ['draft', 'reviewed'])->count(),
                'open_closes' => $closes->whereNotIn('status', ['closed'])->count(),
            ],
            'salesDocuments' => $documents,
            'bankReconciliations' => $reconciliations,
            'bankRules' => BankRule::query()->where('organization_id', $organizationId)->with('counterAccount:id,code,name')->orderBy('priority')->get(),
            'inventoryControls' => $inventory,
            'vatReturns' => VatReturn::query()->where('organization_id', $organizationId)->latest('to_date')->latest('version')->limit(30)->get(),
            'closes' => $closes,
            'dimensions' => $dimensions,
            'budgets' => $budgets,
            'approvalLimits' => AccountingApprovalLimit::query()->where('organization_id', $organizationId)->latest()->get(),
            'options' => [
                'branches' => $this->branchAccess->availableBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name])->values(),
                'accounts' => GlAccount::query()->where('organization_id', $organizationId)->where('active', true)->orderBy('code')->get(['id', 'code', 'name', 'type', 'system_key']),
                'clientAccounts' => ClientAccount::query()->whereHas('clientFile.client', fn ($query) => $query->where('organization_id', $organizationId))
                    ->when($branchIds !== null, fn ($query) => $query->whereHas('clientFile', fn ($file) => $file->whereIn('branch_id', $branchIds)))
                    ->with('clientFile.client:id,first_name,last_name,client_no')->get()->map(fn ($account) => ['value' => (string) $account->id, 'label' => $account->account_no.' · '.trim($account->clientFile->client->first_name.' '.$account->clientFile->client->last_name), 'currency' => $account->currency_code]),
                'catalogItems' => CatalogItem::query()->where('organization_id', $organizationId)->where('status', 'active')->with('taxCode:id,code,rate')->orderBy('name')->get(['id', 'code', 'name', 'type', 'track_inventory', 'default_unit_price', 'default_cost', 'average_cost', 'tax_code_id']),
                'inventoryItems' => $inventoryItems->map(fn ($item) => [
                    'value' => (string) $item->id, 'label' => $item->code.' · '.$item->name,
                    'stock_on_hand' => (float) ($item->stock_on_hand ?? 0), 'committed_quantity' => (float) ($item->committed_quantity ?? 0),
                    'available_quantity' => (float) ($item->stock_on_hand ?? 0) - (float) ($item->committed_quantity ?? 0),
                    'on_order_quantity' => (float) ($item->on_order_quantity ?? 0),
                    'average_cost' => (float) ($item->average_cost ?: $item->default_cost), 'reorder_level' => (float) $item->reorder_level,
                    'valuation' => (float) ($item->stock_on_hand ?? 0) * (float) ($item->average_cost ?: $item->default_cost),
                ]),
                'banks' => BankAccount::query()->where('organization_id', $organizationId)->where('active', true)->get()->map(fn ($bank) => ['value' => (string) $bank->id, 'label' => $bank->bank_name.' · '.$bank->account_mask, 'currency' => $bank->currency_code]),
                'statements' => BankStatementImport::query()->where('organization_id', $organizationId)->latest('to_date')->get()->map(fn ($statement) => ['value' => (string) $statement->id, 'bank_account_id' => (string) $statement->bank_account_id, 'label' => $statement->statement_no.' · '.$statement->from_date->format('d M').'–'.$statement->to_date->format('d M Y')]),
                'fiscalYears' => FiscalYear::query()->where('organization_id', $organizationId)->latest('starts_on')->get(['id', 'name', 'starts_on', 'ends_on', 'status']),
                'periods' => AccountingPeriod::query()->whereHas('fiscalYear', fn ($query) => $query->where('organization_id', $organizationId))->with('fiscalYear:id,name')->orderByDesc('starts_on')->get(),
                'dimensions' => $dimensions,
                'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
            ],
            'permissions' => ['manage' => $request->user()->can('accounting.manage'), 'post' => $request->user()->can('accounting.post')],
        ]);
    }

    public function storeSalesDocument(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'branch_id' => ['required', Rule::in($this->branchAccess->availableBranches($request->user())->pluck('id'))],
            'client_account_id' => ['required', Rule::exists('client_accounts', 'id')],
            'accounting_dimension_id' => ['nullable', Rule::exists('accounting_dimensions', 'id')->where('organization_id', $organizationId)],
            'parent_id' => ['nullable', Rule::exists('sales_documents', 'id')->where('organization_id', $organizationId)],
            'document_type' => ['required', Rule::in(SalesDocument::TYPES)], 'document_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:document_date'], 'currency_code' => ['required', 'string', 'size:3'],
            'document_discount_rate' => ['nullable', 'numeric', 'between:0,100'], 'description' => ['nullable', 'string', 'max:2000'],
            'is_recurring' => ['sometimes', 'boolean'], 'recurrence_pattern' => ['nullable', Rule::in(['weekly', 'monthly', 'quarterly', 'annual'])],
            'next_run_on' => ['nullable', 'date', 'after_or_equal:document_date'], 'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.catalog_item_id' => ['required', Rule::exists('catalog_items', 'id')->where('organization_id', $organizationId)->where('status', 'active')],
            'lines.*.description' => ['nullable', 'string', 'max:255'], 'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'], 'lines.*.discount_rate' => ['nullable', 'numeric', 'between:0,100'],
        ]);
        $document = $this->sales->create($request->user(), $validated);
        $this->audit->record($request, 'accounting.sales-document-created', $document, null, $document->only(['document_no', 'document_type', 'total_amount', 'status']));

        return back()->with('success', "{$document->document_no} saved as draft.");
    }

    public function submitSalesDocument(SalesDocument $salesDocument, Request $request): RedirectResponse
    {
        $this->authorizeDocument($salesDocument, $request);
        $this->requireManage($request);
        $this->sales->submit($salesDocument, $request->user());
        $this->audit->record($request, 'accounting.sales-document-submitted', $salesDocument, ['status' => 'draft'], ['status' => 'submitted']);

        return back()->with('success', "{$salesDocument->document_no} submitted for approval.");
    }

    public function approveSalesDocument(SalesDocument $salesDocument, Request $request): RedirectResponse
    {
        $this->authorizeDocument($salesDocument, $request);
        $this->requirePost($request);
        $this->sales->approve($salesDocument, $request->user());
        $this->audit->record($request, 'accounting.sales-document-approved', $salesDocument, ['status' => 'submitted'], ['status' => 'approved']);

        return back()->with('success', "{$salesDocument->document_no} approved.");
    }

    public function postSalesDocument(SalesDocument $salesDocument, Request $request): RedirectResponse
    {
        $this->authorizeDocument($salesDocument, $request);
        $this->requirePost($request);
        $this->sales->post($salesDocument, $request->user());
        $this->audit->record($request, 'accounting.sales-document-posted', $salesDocument, ['status' => 'approved'], ['status' => 'posted']);

        return back()->with('success', "{$salesDocument->document_no} permanently posted.");
    }

    public function convertSalesDocument(SalesDocument $salesDocument, Request $request): RedirectResponse
    {
        $this->authorizeDocument($salesDocument, $request);
        $this->requireManage($request);
        $validated = $request->validate(['target_type' => ['required', Rule::in(SalesDocument::TYPES)]]);
        $copy = $this->sales->convert($salesDocument, $request->user(), $validated['target_type']);
        $this->audit->record($request, 'accounting.sales-document-converted', $copy, null, ['source_id' => $salesDocument->id, 'document_no' => $copy->document_no]);

        return back()->with('success', "{$copy->document_no} created from {$salesDocument->document_no}.");
    }

    public function generateRecurring(Request $request): RedirectResponse
    {
        $this->requireManage($request);

        return back()->with('success', $this->sales->generateRecurring($request->user()).' recurring sales documents generated.');
    }

    public function storeBankRule(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'bank_account_id' => ['nullable', Rule::exists('bank_accounts', 'id')->where('organization_id', $organizationId)],
            'name' => ['required', 'string', 'max:100'], 'match_operator' => ['required', Rule::in(['contains', 'equals', 'starts_with', 'ends_with'])],
            'pattern' => ['required', 'string', 'max:180'], 'counter_account_id' => ['required', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)],
            'accounting_dimension_id' => ['nullable', Rule::exists('accounting_dimensions', 'id')->where('organization_id', $organizationId)],
            'priority' => ['required', 'integer', 'between:1,999'], 'active' => ['sometimes', 'boolean'],
        ]);
        $rule = BankRule::query()->create([...$validated, 'organization_id' => $organizationId]);
        $this->audit->record($request, 'accounting.bank-rule-created', $rule, null, $rule->toArray());

        return back()->with('success', 'Bank rule created.');
    }

    public function storeBankReconciliation(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'bank_account_id' => ['required', Rule::exists('bank_accounts', 'id')->where('organization_id', $organizationId)],
            'bank_statement_import_id' => ['nullable', Rule::exists('bank_statement_imports', 'id')->where('organization_id', $organizationId)],
            'reference' => ['required', 'string', 'max:80', Rule::unique('bank_reconciliations')->where('organization_id', $organizationId)],
            'from_date' => ['required', 'date'], 'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'opening_statement_balance' => ['required', 'numeric'], 'closing_statement_balance' => ['required', 'numeric'],
        ]);
        $reconciliation = $this->controls->createBankReconciliation($request->user(), $validated);
        $this->audit->record($request, 'accounting.bank-reconciliation-created', $reconciliation, null, $reconciliation->only(['reference', 'difference', 'status']));

        return back()->with('success', "Reconciliation {$reconciliation->reference} opened.");
    }

    public function applyBankRules(BankReconciliation $bankReconciliation, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($bankReconciliation, $request);
        $this->requirePost($request);

        return back()->with('success', $this->controls->applyBankRules($bankReconciliation, $request->user()).' statement lines coded by bank rules.');
    }

    public function resolveBankItem(BankReconciliationItem $bankReconciliationItem, Request $request): RedirectResponse
    {
        $bankReconciliationItem->load('bankReconciliation');
        $this->authorizeOrganization($bankReconciliationItem->bankReconciliation, $request);
        $this->requirePost($request);
        $validated = $request->validate(['status' => ['required', Rule::in(['matched', 'exception'])], 'journal_entry_id' => ['nullable', 'integer'], 'resolution_note' => ['required', 'string', 'max:1000']]);
        $this->controls->resolveBankItem($bankReconciliationItem, $request->user(), $validated['status'], $validated['journal_entry_id'] ?? null, $validated['resolution_note']);

        return back()->with('success', 'Reconciliation item resolved.');
    }

    public function reviewBankReconciliation(BankReconciliation $bankReconciliation, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($bankReconciliation, $request);
        $this->requirePost($request);
        $validated = $request->validate(['review_note' => ['nullable', 'string', 'max:2000']]);
        $this->controls->reviewBankReconciliation($bankReconciliation, $request->user(), $validated['review_note'] ?? null);

        return back()->with('success', 'Bank reconciliation reviewed.');
    }

    public function approveBankReconciliation(BankReconciliation $bankReconciliation, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($bankReconciliation, $request);
        $this->requirePost($request);
        $this->controls->approveBankReconciliation($bankReconciliation, $request->user());
        $this->audit->record($request, 'accounting.bank-reconciliation-signed-off', $bankReconciliation, ['status' => 'reviewed'], ['status' => 'signed_off']);

        return back()->with('success', 'Bank reconciliation permanently signed off.');
    }

    public function exportBankReconciliation(BankReconciliation $bankReconciliation, string $format, Request $request, BankReconciliationWorkbook $workbook): BinaryFileResponse|HttpResponse
    {
        $this->authorizeOrganization($bankReconciliation, $request);
        abort_unless(in_array($format, ['pdf', 'excel'], true), 404);
        $bankReconciliation->load(['bankAccount', 'items.statementLine', 'items.journal:id,journal_no,reference']);
        $organization = $request->user()->organization?->trading_name ?? 'Alpha Land';
        if ($format === 'pdf') {
            return Pdf::loadView('reports.bank-reconciliation', compact('bankReconciliation', 'organization') + ['reconciliation' => $bankReconciliation])
                ->setPaper('a4', 'landscape')->download('BANK-RECONCILIATION-'.$bankReconciliation->reference.'.pdf');
        }
        $path = $workbook->create($bankReconciliation, $organization);

        return response()->download($path, 'BANK-RECONCILIATION-'.$bankReconciliation->reference.'.xlsx')->deleteFileAfterSend(true);
    }

    public function storeInventoryControl(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'branch_id' => ['required', Rule::in($this->branchAccess->availableBranches($request->user())->pluck('id'))],
            'control_type' => ['required', Rule::in(['stock_count', 'adjustment', 'purchase_return', 'sales_return'])], 'control_date' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:2000'], 'lines' => ['required', 'array', 'min:1', 'max:500'],
            'lines.*.catalog_item_id' => ['required', 'distinct', Rule::exists('catalog_items', 'id')->where('organization_id', $organizationId)],
            'lines.*.counted_quantity' => ['required', 'numeric', 'min:0'], 'lines.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lines.*.counter_account_id' => ['required', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)], 'lines.*.note' => ['nullable', 'string', 'max:1000'],
        ]);
        $control = $this->controls->createInventoryControl($request->user(), $validated);
        $this->audit->record($request, 'accounting.inventory-control-created', $control, null, ['control_no' => $control->control_no, 'lines' => count($validated['lines'])]);

        return back()->with('success', "{$control->control_no} saved as draft.");
    }

    public function approveInventoryControl(InventoryControl $inventoryControl, Request $request): RedirectResponse
    {
        $this->authorizeDocument($inventoryControl, $request);
        $this->requirePost($request);
        $this->controls->approveInventoryControl($inventoryControl, $request->user());

        return back()->with('success', "{$inventoryControl->control_no} approved.");
    }

    public function postInventoryControl(InventoryControl $inventoryControl, Request $request): RedirectResponse
    {
        $this->authorizeDocument($inventoryControl, $request);
        $this->requirePost($request);
        $this->controls->postInventoryControl($inventoryControl, $request->user());
        $this->audit->record($request, 'accounting.inventory-control-posted', $inventoryControl, ['status' => 'approved'], ['status' => 'posted']);

        return back()->with('success', "{$inventoryControl->control_no} posted to stock and the ledger.");
    }

    public function storeVatReturn(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $validated = $request->validate(['from_date' => ['required', 'date'], 'to_date' => ['required', 'date', 'after_or_equal:from_date'], 'currency_code' => ['required', 'string', 'size:3'], 'amendment_reason' => ['nullable', 'string', 'max:2000']]);
        $return = $this->controls->prepareVatReturn($request->user(), $validated);
        $this->audit->record($request, 'accounting.vat-return-prepared', $return, null, $return->only(['from_date', 'to_date', 'version', 'net_tax', 'variance']));

        return back()->with('success', "VAT return version {$return->version} prepared.");
    }

    public function transitionVatReturn(VatReturn $vatReturn, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($vatReturn, $request);
        $this->requirePost($request);
        $validated = $request->validate(['status' => ['required', Rule::in(['reviewed', 'approved', 'submitted'])]]);
        $before = $vatReturn->status;
        $this->controls->transitionVatReturn($vatReturn, $request->user(), $validated['status']);
        $this->audit->record($request, 'accounting.vat-return-'.$validated['status'], $vatReturn, ['status' => $before], ['status' => $validated['status']]);

        return back()->with('success', 'VAT return moved to '.$validated['status'].'.');
    }

    public function exportVatReturn(VatReturn $vatReturn, string $format, Request $request, TaxReportWorkbook $workbook): BinaryFileResponse|HttpResponse
    {
        $this->authorizeOrganization($vatReturn, $request);
        abort_unless(in_array($format, ['pdf', 'excel'], true), 404);
        $report = $this->taxReports->report($request->user(), $vatReturn->from_date->toDateString(), $vatReturn->to_date->toDateString());
        $data = ['organization' => $request->user()->organization?->trading_name ?? 'Alpha Land', 'from' => $vatReturn->from_date->toDateString(), 'to' => $vatReturn->to_date->toDateString(), 'return' => $vatReturn, 'report' => $report];
        if ($format === 'pdf') {
            return Pdf::loadView('reports.vat-return', $data)->setPaper('a4', 'landscape')->download('VAT-RETURN-'.$vatReturn->id.'.pdf');
        }
        $path = $workbook->create($data);

        return response()->download($path, 'VAT-RETURN-'.$vatReturn->id.'.xlsx')->deleteFileAfterSend(true);
    }

    public function storeClose(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'close_type' => ['required', Rule::in(['month', 'year'])], 'reference' => ['required', 'string', 'max:80', Rule::unique('accounting_closes')->where('organization_id', $organizationId)],
            'accounting_period_id' => ['nullable', Rule::exists('accounting_periods', 'id')], 'fiscal_year_id' => ['nullable', Rule::exists('fiscal_years', 'id')->where('organization_id', $organizationId)],
        ]);
        if ($validated['close_type'] === 'month' && empty($validated['accounting_period_id'])) {
            return back()->withErrors(['accounting_period_id' => 'Select a period for a month-end close.']);
        }
        if ($validated['close_type'] === 'year' && empty($validated['fiscal_year_id'])) {
            return back()->withErrors(['fiscal_year_id' => 'Select a fiscal year for a year-end close.']);
        }
        $close = $this->controls->createClose($request->user(), $validated);

        return back()->with('success', "Close checklist {$close->reference} created.");
    }

    public function completeCloseTask(AccountingClose $accountingClose, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($accountingClose, $request);
        $this->requireManage($request);
        $validated = $request->validate(['task_key' => ['required', 'string'], 'evidence' => ['required', 'string', 'max:2000']]);
        $this->controls->completeCloseTask($accountingClose, $request->user(), $validated['task_key'], $validated['evidence']);

        return back()->with('success', 'Close task completed with evidence.');
    }

    public function reviewClose(AccountingClose $accountingClose, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($accountingClose, $request);
        $this->requirePost($request);
        $this->controls->reviewClose($accountingClose, $request->user());

        return back()->with('success', 'Close checklist reviewed.');
    }

    public function approveClose(AccountingClose $accountingClose, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($accountingClose, $request);
        $this->requirePost($request);
        $this->controls->approveClose($accountingClose, $request->user());
        $this->audit->record($request, 'accounting.period-close-approved', $accountingClose, ['status' => 'reviewed'], ['status' => 'closed']);

        return back()->with('success', 'Accounting close approved and period locked.');
    }

    public function reopenClose(AccountingClose $accountingClose, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($accountingClose, $request);
        $this->requirePost($request);
        $validated = $request->validate(['reason' => ['required', 'string', 'min:10', 'max:2000']]);
        $this->controls->reopenClose($accountingClose, $request->user(), $validated['reason']);
        $this->audit->record($request, 'accounting.period-reopen-requested', $accountingClose, ['status' => 'closed'], ['status' => 'reopen_requested', 'reason' => $validated['reason']]);

        return back()->with('success', 'Period reopen request submitted for independent approval.');
    }

    public function approveReopen(AccountingClose $accountingClose, Request $request): RedirectResponse
    {
        $this->authorizeOrganization($accountingClose, $request);
        $this->requirePost($request);
        $this->controls->approveReopen($accountingClose, $request->user());
        $this->audit->record($request, 'accounting.period-reopen-approved', $accountingClose, ['status' => 'reopen_requested'], ['status' => 'reopened']);

        return back()->with('success', 'Period reopen approved. The period is open again.');
    }

    public function storeDimension(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate(['kind' => ['required', Rule::in(['department', 'cost_centre', 'project'])], 'code' => ['required', 'string', 'max:40'], 'name' => ['required', 'string', 'max:120'], 'active' => ['sometimes', 'boolean']]);
        $dimension = AccountingDimension::query()->updateOrCreate(['organization_id' => $organizationId, 'kind' => $validated['kind'], 'code' => strtoupper($validated['code'])], ['name' => $validated['name'], 'active' => $validated['active'] ?? true]);
        $this->audit->record($request, 'accounting.dimension-saved', $dimension, null, $dimension->toArray());

        return back()->with('success', 'Accounting dimension saved.');
    }

    public function storeBudget(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate([
            'fiscal_year_id' => ['required', Rule::exists('fiscal_years', 'id')->where('organization_id', $organizationId)],
            'accounting_dimension_id' => ['nullable', Rule::exists('accounting_dimensions', 'id')->where('organization_id', $organizationId)],
            'gl_account_id' => ['required', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)], 'period_number' => ['required', 'integer', 'between:1,12'],
            'amount' => ['required', 'numeric'], 'warning_threshold' => ['required', 'numeric', 'between:1,999'], 'require_approval' => ['sometimes', 'boolean'],
        ]);
        $budget = AccountingBudget::query()->updateOrCreate([
            'organization_id' => $organizationId, 'fiscal_year_id' => $validated['fiscal_year_id'], 'accounting_dimension_id' => $validated['accounting_dimension_id'] ?? null,
            'gl_account_id' => $validated['gl_account_id'], 'period_number' => $validated['period_number'],
        ], [...$validated, 'created_by' => $request->user()->id]);
        $this->audit->record($request, 'accounting.budget-saved', $budget, null, $budget->toArray());

        return back()->with('success', 'Budget line saved.');
    }

    public function storeApprovalLimit(Request $request): RedirectResponse
    {
        $this->requirePost($request);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate(['user_id' => ['nullable', 'integer'], 'role_name' => ['nullable', 'string', 'max:80'], 'transaction_type' => ['required', 'string', 'max:40'], 'minimum_amount' => ['required', 'numeric', 'min:0'], 'maximum_amount' => ['nullable', 'numeric', 'gte:minimum_amount'], 'active' => ['sometimes', 'boolean']]);
        if (empty($validated['user_id']) && empty($validated['role_name'])) {
            return back()->withErrors(['role_name' => 'Choose a user or role for this approval limit.']);
        }
        AccountingApprovalLimit::query()->create([...$validated, 'organization_id' => $organizationId]);

        return back()->with('success', 'Approval authority saved.');
    }

    public function storeAttachment(Request $request): RedirectResponse
    {
        $this->requireManage($request);
        $validated = $request->validate(['subject_type' => ['required', Rule::in(array_keys($this->attachmentTypes()))], 'subject_id' => ['required', 'integer'], 'file' => ['required', 'file', 'max:20480', 'mimes:pdf,png,jpg,jpeg,xlsx,xls,csv,doc,docx']]);
        $class = $this->attachmentTypes()[$validated['subject_type']];
        $subject = $class::query()->where('organization_id', $request->user()->organization_id)->findOrFail($validated['subject_id']);
        $path = $validated['file']->store('accounting/'.$validated['subject_type']);
        $attachment = AccountingAttachment::query()->create(['organization_id' => $request->user()->organization_id, 'subject_type' => $class, 'subject_id' => $subject->id, 'original_name' => $validated['file']->getClientOriginalName(), 'disk' => 'local', 'path' => $path, 'mime_type' => $validated['file']->getMimeType(), 'size_bytes' => $validated['file']->getSize(), 'uploaded_by' => $request->user()->id]);
        $this->audit->record($request, 'accounting.attachment-uploaded', $attachment, null, ['subject_type' => $validated['subject_type'], 'subject_id' => $subject->id, 'name' => $attachment->original_name]);

        return back()->with('success', 'Supporting document attached.');
    }

    public function downloadAttachment(AccountingAttachment $accountingAttachment, Request $request): StreamedResponse
    {
        $this->authorizeOrganization($accountingAttachment, $request);

        return Storage::disk($accountingAttachment->disk)->download($accountingAttachment->path, $accountingAttachment->original_name);
    }

    private function authorizeDocument($document, Request $request): void
    {
        abort_unless((int) $document->organization_id === (int) $request->user()->organization_id && $this->branchAccess->canAccess($request->user(), (int) $document->branch_id), 404);
    }

    private function authorizeOrganization($record, Request $request): void
    {
        abort_unless((int) $record->organization_id === (int) $request->user()->organization_id, 404);
    }

    private function requireManage(Request $request): void
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
    }

    private function requirePost(Request $request): void
    {
        abort_unless($request->user()->can('accounting.post'), 403);
    }

    private function attachmentTypes(): array
    {
        return ['sales-document' => SalesDocument::class, 'bank-reconciliation' => BankReconciliation::class, 'inventory-control' => InventoryControl::class, 'vat-return' => VatReturn::class, 'accounting-close' => AccountingClose::class];
    }
}
