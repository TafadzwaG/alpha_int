<?php

namespace App\Http\Controllers;

use App\Models\AccountingBudget;
use App\Models\AccountingDimension;
use App\Models\AccountingPeriod;
use App\Models\BankAccount;
use App\Models\CatalogItem;
use App\Models\GlAccount;
use App\Models\Supplier;
use App\Models\SupplierBill;
use App\Models\SupplierPayment;
use App\Models\TaxCode;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\GeneralLedgerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountingPayablesController extends Controller
{
    private const AGEING_BUCKETS = [
        ['key' => 'under-30', 'label' => '< 30 days', 'from' => 0, 'to' => 29],
        ['key' => '30', 'label' => '30–59 days', 'from' => 30, 'to' => 59],
        ['key' => '60', 'label' => '60–89 days', 'from' => 60, 'to' => 89],
        ['key' => '90', 'label' => '90–119 days', 'from' => 90, 'to' => 119],
        ['key' => '120', 'label' => '120–149 days', 'from' => 120, 'to' => 149],
        ['key' => '150', 'label' => '150–179 days', 'from' => 150, 'to' => 179],
        ['key' => '180-plus', 'label' => '180+ days', 'from' => 180, 'to' => null],
    ];

    public function __construct(private readonly GeneralLedgerService $ledger, private readonly BranchAccessService $branchAccess, private readonly AuditLogger $auditLogger) {}

    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $branchIds = $this->branchAccess->branchIds($request->user());
        $billsQuery = SupplierBill::query()->where('organization_id', $organizationId)->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds));
        $search = trim((string) $request->string('search'));
        $bucket = (string) $request->string('bucket');
        if (! collect(self::AGEING_BUCKETS)->pluck('key')->contains($bucket)) {
            $bucket = 'all';
        }
        $allBills = (clone $billsQuery)->with(['supplier:id,name,supplier_no', 'branch:id,name', 'lines.account:id,code,name', 'payments'])->latest('bill_date')->get();
        $rows = $allBills->map(function (SupplierBill $bill): array {
            $outstanding = max(0, (float) $bill->total_amount - (float) $bill->paid_amount);
            $days = $outstanding > 0 ? max(0, $bill->due_date->diffInDays(today(), false)) : 0;

            return [
                ...$bill->toArray(),
                'outstanding' => round($outstanding, 4),
                'days_outstanding' => $days,
                'ageing_bucket' => $this->ageingBucket($days),
            ];
        });
        $openRows = $rows->filter(fn (array $bill) => $bill['outstanding'] > 0 && in_array($bill['status'], ['posted', 'partially_paid', 'overdue'], true));
        $ageing = collect(self::AGEING_BUCKETS)->map(function (array $definition) use ($openRows): array {
            $items = $openRows->where('ageing_bucket', $definition['key']);

            return [
                'key' => $definition['key'],
                'label' => $definition['label'],
                'total' => round((float) $items->sum('outstanding'), 4),
                'bills' => $items->count(),
            ];
        })->values();
        $filteredRows = $rows
            ->when($search !== '', function ($items) use ($search) {
                $needle = Str::lower($search);

                return $items->filter(fn (array $bill) => collect([
                    $bill['bill_no'], $bill['supplier_reference'], $bill['supplier']['name'] ?? null,
                    $bill['supplier']['supplier_no'] ?? null, $bill['branch']['name'] ?? null,
                ])->filter()->contains(fn (string $value) => str_contains(Str::lower($value), $needle)));
            })
            ->when($bucket !== 'all', fn ($items) => $items->filter(fn (array $bill) => $bill['outstanding'] > 0 && $bill['ageing_bucket'] === $bucket))
            ->values();
        $page = max(1, (int) $request->integer('page', 1));
        $perPage = 20;
        $bills = new LengthAwarePaginator(
            $filteredRows->forPage($page, $perPage)->values(),
            $filteredRows->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return Inertia::render('accounting/payables', [
            'suppliers' => Supplier::query()->where('organization_id', $organizationId)->with(['bills' => fn ($query) => $query
                ->select(['id', 'supplier_id', 'branch_id', 'total_amount', 'paid_amount', 'status'])
                ->when($branchIds !== null, fn ($billQuery) => $billQuery->whereIn('branch_id', $branchIds))])
                ->orderBy('name')->get()->map(function (Supplier $supplier): array {
                    return [
                        ...$supplier->only(['id', 'supplier_no', 'name', 'tax_number', 'email', 'phone', 'currency_code', 'payment_terms_days', 'status']),
                        'outstanding' => (float) $supplier->bills->whereIn('status', ['posted', 'partially_paid', 'overdue'])->sum(fn (SupplierBill $bill) => (float) $bill->total_amount - (float) $bill->paid_amount),
                    ];
                }),
            'bills' => $bills,
            'expenseAccounts' => GlAccount::query()->where('organization_id', $organizationId)->where('type', 'expense')->where('active', true)->orderBy('code')->get()->map(fn ($account) => ['value' => (string) $account->id, 'label' => $account->code.' · '.$account->name]),
            'taxCodes' => TaxCode::query()->where('organization_id', $organizationId)->where('active', true)->orderBy('code')->get(['code', 'name', 'rate']),
            'branches' => $this->branchAccess->availableBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name]),
            'bankAccounts' => BankAccount::query()->where('organization_id', $organizationId)->where('active', true)->get()->map(fn ($bank) => ['value' => (string) $bank->id, 'label' => $bank->bank_name.' · '.$bank->account_mask]),
            'dimensions' => AccountingDimension::query()->where('organization_id', $organizationId)->where('active', true)->orderBy('kind')->orderBy('code')->get()->map(fn ($dimension) => ['value' => (string) $dimension->id, 'label' => str($dimension->kind)->headline().' · '.$dimension->code.' · '.$dimension->name]),
            'catalogItems' => CatalogItem::query()
                ->where('organization_id', $organizationId)
                ->where('status', 'active')
                ->with(['expenseAccount:id,code,name', 'taxCode:id,code,rate'])
                ->orderBy('type')
                ->orderBy('name')
                ->get()
                ->map(fn (CatalogItem $item) => [
                    'id' => $item->id,
                    'code' => $item->code,
                    'name' => $item->name,
                    'type' => $item->type,
                    'unit_of_measure' => $item->unit_of_measure,
                    'default_unit_price' => (float) $item->default_unit_price,
                    'currency_code' => $item->currency_code,
                    'expense_account_id' => $item->expense_account_id,
                    'tax_code' => $item->taxCode?->code,
                ]),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
            'permissions' => ['manage' => $request->user()->can('accounting.manage'), 'post' => $request->user()->can('accounting.post')],
            'ageing' => $ageing,
            'filters' => ['search' => $search, 'bucket' => $bucket],
            'summary' => [
                'outstanding' => (float) (clone $billsQuery)->whereIn('status', ['posted', 'partially_paid', 'overdue'])->selectRaw('SUM(total_amount - paid_amount) total')->value('total'),
                'overdue' => (float) (clone $billsQuery)->whereIn('status', ['posted', 'partially_paid', 'overdue'])->whereDate('due_date', '<', today())->selectRaw('SUM(total_amount - paid_amount) total')->value('total'),
                'drafts' => (clone $billsQuery)->where('status', 'draft')->count(),
                'suppliers' => Supplier::query()->where('organization_id', $organizationId)->where('status', 'active')->count(),
            ],
        ]);
    }

    private function ageingBucket(int $days): string
    {
        $bucket = collect(self::AGEING_BUCKETS)->first(fn (array $definition) => $days >= $definition['from'] && ($definition['to'] === null || $days <= $definition['to'])
        );

        return $bucket['key'] ?? '180-plus';
    }

    public function storeSupplier(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = $request->user()->organization_id;
        $validated = $this->validateSupplier($request);
        $sequence = Supplier::query()->where('organization_id', $organizationId)->count() + 1;
        $supplier = Supplier::query()->create([...$validated, 'organization_id' => $organizationId, 'supplier_no' => sprintf('SUP-%05d', $sequence), 'status' => 'active']);
        $this->auditLogger->record($request, 'accounting.supplier-created', $supplier, null, ['supplier_no' => $supplier->supplier_no, 'name' => $supplier->name]);

        return back()->with('success', "Supplier {$supplier->supplier_no} created.");
    }

    public function showSupplier(Supplier $supplier, Request $request): Response
    {
        $this->authorizeSupplier($supplier, $request);
        $branchIds = $this->branchAccess->branchIds($request->user());
        $baseBills = $supplier->bills()->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds));
        $bills = (clone $baseBills)
            ->with(['branch:id,name', 'payments:id,supplier_bill_id,payment_date,amount,reference'])
            ->latest('bill_date')
            ->paginate(20)
            ->withQueryString();
        $openBills = (clone $baseBills)->whereIn('status', ['posted', 'partially_paid', 'overdue']);

        return Inertia::render('accounting/supplier-show', [
            'supplier' => [
                ...$supplier->toArray(),
                'summary' => [
                    'lifetime_billed' => (float) (clone $baseBills)->where('status', '!=', 'draft')->sum('total_amount'),
                    'lifetime_paid' => (float) (clone $baseBills)->sum('paid_amount'),
                    'outstanding' => (float) (clone $openBills)->selectRaw('SUM(total_amount - paid_amount) total')->value('total'),
                    'open_bills' => (clone $openBills)->count(),
                ],
            ],
            'bills' => $bills,
            'permissions' => ['manage' => $request->user()->can('accounting.manage')],
        ]);
    }

    public function updateSupplier(Supplier $supplier, Request $request): RedirectResponse
    {
        $this->authorizeSupplier($supplier, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $before = $supplier->toArray();
        $supplier->update($this->validateSupplier($request, $supplier));
        $this->auditLogger->record($request, 'accounting.supplier-updated', $supplier, $before, $supplier->fresh()->toArray());

        return back()->with('success', "Supplier {$supplier->supplier_no} updated.");
    }

    public function updateSupplierStatus(Supplier $supplier, Request $request): RedirectResponse
    {
        $this->authorizeSupplier($supplier, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $validated = $request->validate(['status' => ['required', Rule::in(['active', 'inactive'])]]);
        if ($validated['status'] === 'inactive' && $supplier->bills()->where('status', 'draft')->exists()) {
            throw ValidationException::withMessages(['status' => 'Post or remove draft bills before archiving this supplier.']);
        }
        $before = ['status' => $supplier->status];
        $supplier->update($validated);
        $this->auditLogger->record($request, 'accounting.supplier-status-changed', $supplier, $before, $validated);

        return back()->with('success', "Supplier {$supplier->supplier_no} is now {$supplier->status}.");
    }

    public function exportSuppliers(Request $request): StreamedResponse
    {
        $branchIds = $this->branchAccess->branchIds($request->user());
        $suppliers = Supplier::query()
            ->where('organization_id', $request->user()->organization_id)
            ->with(['bills' => fn ($query) => $query
                ->select(['id', 'supplier_id', 'branch_id', 'total_amount', 'paid_amount', 'status'])
                ->when($branchIds !== null, fn ($billQuery) => $billQuery->whereIn('branch_id', $branchIds))])
            ->orderBy('supplier_no')
            ->get();

        return response()->streamDownload(function () use ($suppliers): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['Supplier no.', 'Name', 'Tax number', 'Email', 'Phone', 'Address', 'Currency', 'Terms (days)', 'Outstanding', 'Status']);
            foreach ($suppliers as $supplier) {
                $outstanding = $supplier->bills->whereIn('status', ['posted', 'partially_paid', 'overdue'])
                    ->sum(fn (SupplierBill $bill) => (float) $bill->total_amount - (float) $bill->paid_amount);
                fputcsv($stream, [$supplier->supplier_no, $supplier->name, $supplier->tax_number, $supplier->email, $supplier->phone, $supplier->address, $supplier->currency_code, $supplier->payment_terms_days, $outstanding, $supplier->status]);
            }
            fclose($stream);
        }, 'SUPPLIER-MASTER-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function storeBill(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = $request->user()->organization_id;
        $branchIds = $this->branchAccess->availableBranches($request->user())->pluck('id');
        $validated = $request->validate([
            'supplier_id' => ['required', Rule::exists('suppliers', 'id')->where('organization_id', $organizationId)->where('status', 'active')],
            'accounting_dimension_id' => ['nullable', Rule::exists('accounting_dimensions', 'id')->where('organization_id', $organizationId)->where('active', true)],
            'branch_id' => ['required', Rule::in($branchIds)], 'supplier_reference' => ['nullable', 'string', 'max:100'],
            'bill_date' => ['required', 'date'], 'due_date' => ['required', 'date', 'after_or_equal:bill_date'], 'currency_code' => ['required', Rule::exists('currencies', 'code')],
            'description' => ['nullable', 'string', 'max:1000'], 'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.catalog_item_id' => ['nullable', Rule::exists('catalog_items', 'id')->where('organization_id', $organizationId)->where('status', 'active')],
            'lines.*.gl_account_id' => ['required', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)->where('type', 'expense')],
            'lines.*.description' => ['required', 'string', 'max:255'], 'lines.*.quantity' => ['required', 'numeric', 'gt:0'], 'lines.*.unit_price' => ['required', 'numeric', 'gt:0'],
            'lines.*.tax_code' => ['nullable', Rule::exists('tax_codes', 'code')->where('organization_id', $organizationId)],
        ]);
        $taxRates = TaxCode::query()->where('organization_id', $organizationId)->pluck('rate', 'code');
        $lines = collect($validated['lines'])->map(function (array $line) use ($taxRates): array {
            $subtotal = round((float) $line['quantity'] * (float) $line['unit_price'], 4);
            $rate = (float) ($taxRates[$line['tax_code'] ?? ''] ?? 0);
            $tax = round($subtotal * $rate / 100, 4);

            return [...$line, 'tax_rate' => $rate, 'line_subtotal' => $subtotal, 'tax_amount' => $tax, 'line_total' => $subtotal + $tax];
        });
        $bill = DB::transaction(function () use ($request, $organizationId, $validated, $lines): SupplierBill {
            DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->value('id');
            $sequence = SupplierBill::query()->where('organization_id', $organizationId)->whereYear('bill_date', now()->parse($validated['bill_date'])->year)->count() + 1;
            $bill = SupplierBill::query()->create([
                ...collect($validated)->except('lines')->all(), 'organization_id' => $organizationId,
                'bill_no' => sprintf('BILL-%s-%05d', now()->parse($validated['bill_date'])->format('Y'), $sequence),
                'subtotal' => $lines->sum('line_subtotal'), 'tax_amount' => $lines->sum('tax_amount'), 'total_amount' => $lines->sum('line_total'),
                'paid_amount' => 0, 'status' => 'draft', 'created_by' => $request->user()->id,
            ]);
            $bill->lines()->createMany($lines->all());

            return $bill;
        });
        $this->auditLogger->record($request, 'accounting.supplier-bill-created', $bill, null, ['bill_no' => $bill->bill_no, 'total' => (float) $bill->total_amount]);

        return back()->with('success', "Supplier bill {$bill->bill_no} saved as draft.");
    }

    public function postBill(SupplierBill $supplierBill, Request $request): RedirectResponse
    {
        $this->authorizeBill($supplierBill, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        if ($supplierBill->status !== 'draft') {
            throw ValidationException::withMessages(['bill' => 'Only draft supplier bills can be posted.']);
        }
        $supplierBill->load('lines');
        if ((int) $supplierBill->created_by === (int) $request->user()->id && $this->exceedsControlledBudget($supplierBill)) {
            throw ValidationException::withMessages(['bill' => 'This bill exceeds a controlled budget threshold. A different authorised user must review and post it.']);
        }
        $accounts = GlAccount::query()->where('organization_id', $supplierBill->organization_id)->whereIn('system_key', ['accounts_payable', 'vat_input'])->pluck('id', 'system_key');
        $lines = $supplierBill->lines->map(fn ($line) => ['gl_account_id' => $line->gl_account_id, 'accounting_dimension_id' => $supplierBill->accounting_dimension_id, 'debit' => (float) $line->line_subtotal, 'credit' => 0, 'description' => $line->description])->values();
        if ((float) $supplierBill->tax_amount > 0) {
            $lines->push(['gl_account_id' => $accounts['vat_input'], 'accounting_dimension_id' => $supplierBill->accounting_dimension_id, 'debit' => (float) $supplierBill->tax_amount, 'credit' => 0, 'description' => 'Input tax']);
        }
        $lines->push(['gl_account_id' => $accounts['accounts_payable'], 'accounting_dimension_id' => $supplierBill->accounting_dimension_id, 'debit' => 0, 'credit' => (float) $supplierBill->total_amount, 'description' => 'Payable to '.$supplierBill->supplier?->name]);
        $journal = $this->ledger->createSystemJournal($supplierBill->organization_id, $supplierBill->branch_id, $request->user()->id, [
            'entry_date' => $supplierBill->bill_date->toDateString(), 'journal_type' => 'purchase', 'reference' => $supplierBill->bill_no,
            'description' => 'Supplier bill '.$supplierBill->bill_no, 'currency_code' => $supplierBill->currency_code, 'source_type' => SupplierBill::class, 'source_id' => $supplierBill->id, 'lines' => $lines->all(),
        ]);
        $supplierBill->forceFill(['journal_entry_id' => $journal?->id, 'status' => 'posted', 'posted_by' => $request->user()->id, 'posted_at' => now(), 'locked_at' => now()])->save();
        $this->auditLogger->record($request, 'accounting.supplier-bill-posted', $supplierBill, ['status' => 'draft'], ['status' => 'posted', 'journal_id' => $journal?->id]);

        return back()->with('success', "Supplier bill {$supplierBill->bill_no} posted.");
    }

    public function payBill(SupplierBill $supplierBill, Request $request): RedirectResponse
    {
        $this->authorizeBill($supplierBill, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'], 'payment_date' => ['required', 'date'], 'reference' => ['required', 'string', 'max:120'],
            'bank_account_id' => ['nullable', Rule::exists('bank_accounts', 'id')->where('organization_id', $supplierBill->organization_id)],
        ]);
        $balance = round((float) $supplierBill->total_amount - (float) $supplierBill->paid_amount, 4);
        if ((float) $validated['amount'] > $balance + 0.0001) {
            throw ValidationException::withMessages(['amount' => 'Payment cannot exceed the outstanding supplier balance.']);
        }
        $accounts = GlAccount::query()->where('organization_id', $supplierBill->organization_id)->whereIn('system_key', ['accounts_payable', 'bank'])->pluck('id', 'system_key');
        $payment = DB::transaction(function () use ($request, $supplierBill, $validated, $accounts): SupplierPayment {
            $payment = SupplierPayment::query()->create([...$validated, 'supplier_bill_id' => $supplierBill->id, 'currency_code' => $supplierBill->currency_code, 'created_by' => $request->user()->id]);
            $journal = $this->ledger->createSystemJournal($supplierBill->organization_id, $supplierBill->branch_id, $request->user()->id, [
                'entry_date' => $validated['payment_date'], 'journal_type' => 'cash_payment', 'reference' => $validated['reference'], 'description' => 'Payment of '.$supplierBill->bill_no,
                'currency_code' => $supplierBill->currency_code, 'source_type' => SupplierPayment::class, 'source_id' => $payment->id,
                'lines' => [['gl_account_id' => $accounts['accounts_payable'], 'debit' => $validated['amount'], 'credit' => 0], ['gl_account_id' => $accounts['bank'], 'debit' => 0, 'credit' => $validated['amount']]],
            ]);
            $payment->forceFill(['journal_entry_id' => $journal?->id])->save();
            $newPaid = round((float) $supplierBill->paid_amount + (float) $validated['amount'], 4);
            $supplierBill->forceFill(['paid_amount' => $newPaid, 'status' => $newPaid >= (float) $supplierBill->total_amount ? 'paid' : 'partially_paid'])->save();

            return $payment;
        });
        $this->auditLogger->record($request, 'accounting.supplier-payment-recorded', $payment, null, ['bill_id' => $supplierBill->id, 'amount' => (float) $payment->amount]);

        return back()->with('success', "Payment recorded against {$supplierBill->bill_no}.");
    }

    private function authorizeBill(SupplierBill $bill, Request $request): void
    {
        abort_unless((int) $bill->organization_id === (int) $request->user()->organization_id, 404);
        $branchIds = $this->branchAccess->branchIds($request->user());
        if ($branchIds !== null && ! $branchIds->contains($bill->branch_id)) {
            abort(404);
        }
    }

    private function exceedsControlledBudget(SupplierBill $bill): bool
    {
        $period = AccountingPeriod::query()->whereHas('fiscalYear', fn ($query) => $query->where('organization_id', $bill->organization_id))
            ->whereDate('starts_on', '<=', $bill->bill_date)->whereDate('ends_on', '>=', $bill->bill_date)->first();
        if (! $period) {
            return false;
        }
        foreach ($bill->lines as $line) {
            $budget = AccountingBudget::query()->where('organization_id', $bill->organization_id)
                ->where('fiscal_year_id', $period->fiscal_year_id)->where('period_number', $period->period_number)
                ->where('gl_account_id', $line->gl_account_id)
                ->where(function ($query) use ($bill): void {
                    $bill->accounting_dimension_id
                        ? $query->where('accounting_dimension_id', $bill->accounting_dimension_id)
                        : $query->whereNull('accounting_dimension_id');
                })->where('require_approval', true)->first();
            if (! $budget) {
                continue;
            }
            $actual = (float) DB::table('journal_lines')->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
                ->where('journal_entries.organization_id', $bill->organization_id)->where('journal_entries.status', 'posted')
                ->whereBetween('journal_entries.entry_date', [$period->starts_on, $period->ends_on])->where('journal_lines.gl_account_id', $line->gl_account_id)
                ->when($bill->accounting_dimension_id, fn ($query) => $query->where('journal_lines.accounting_dimension_id', $bill->accounting_dimension_id), fn ($query) => $query->whereNull('journal_lines.accounting_dimension_id'))
                ->selectRaw('COALESCE(SUM(journal_lines.base_debit - journal_lines.base_credit), 0) total')->value('total');
            if ($actual + (float) $line->line_subtotal > (float) $budget->amount * ((float) $budget->warning_threshold / 100)) {
                return true;
            }
        }

        return false;
    }

    private function authorizeSupplier(Supplier $supplier, Request $request): void
    {
        abort_unless((int) $supplier->organization_id === (int) $request->user()->organization_id, 404);
    }

    private function validateSupplier(Request $request, ?Supplier $supplier = null): array
    {
        $organizationId = $request->user()->organization_id;

        return $request->validate([
            'name' => ['bail', 'required', 'string', 'min:2', 'max:150'],
            'tax_number' => [
                'bail', 'nullable', 'string', 'max:60', 'regex:/^[A-Za-z0-9][A-Za-z0-9 .\/-]*$/',
                Rule::unique('suppliers', 'tax_number')->where('organization_id', $organizationId)->ignore($supplier?->id),
            ],
            'email' => [
                'bail', 'nullable', 'email:rfc', 'max:255',
                Rule::unique('suppliers', 'email')->where('organization_id', $organizationId)->ignore($supplier?->id),
            ],
            'phone' => ['bail', 'nullable', 'string', 'max:40', 'regex:/^\+?[0-9()\-\s]{7,40}$/'],
            'address' => ['nullable', 'string', 'max:1000'],
            'currency_code' => ['bail', 'required', 'string', 'size:3', 'uppercase', Rule::exists('currencies', 'code')],
            'payment_terms_days' => ['bail', 'required', 'integer', 'min:0', 'max:365'],
        ], [
            'tax_number.regex' => 'Use letters, numbers, spaces, slashes, full stops or hyphens only.',
            'tax_number.unique' => 'A supplier with this tax number already exists.',
            'email.unique' => 'A supplier with this email address already exists.',
            'phone.regex' => 'Enter a valid phone number using 7 to 40 digits and phone symbols.',
            'currency_code.uppercase' => 'The currency code must use uppercase letters.',
        ]);
    }
}
