<?php

namespace App\Http\Controllers;

use App\Models\AccountCharge;
use App\Models\AccountingDimension;
use App\Models\AccountingPeriod;
use App\Models\Currency;
use App\Models\Expense;
use App\Models\FiscalYear;
use App\Models\GlAccount;
use App\Models\InterestExemption;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\SystemSetting;
use App\Models\TaxCode;
use App\Services\AccountingService;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\FinancialReportWorkbook;
use App\Services\GeneralLedgerService;
use App\Services\InterestAssessmentService;
use App\Services\SourceDocumentPostingService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class AccountingController extends Controller
{
    public function __construct(
        private readonly AccountingService $accounting,
        private readonly GeneralLedgerService $ledger,
        private readonly InterestAssessmentService $interest,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('accounting/index', $this->accounting->dashboard(
            $request->user(),
            (int) $request->session()->get(BranchAccessService::SESSION_KEY),
        ));
    }

    public function debtors(Request $request): Response
    {
        $receivables = $this->accounting->receivables(
            $request->user(),
            (int) $request->session()->get(BranchAccessService::SESSION_KEY),
        );
        $search = trim((string) $request->string('search'));
        $bucket = (string) $request->string('bucket');
        $validBuckets = collect(AccountingService::BUCKETS)->pluck('key');
        if (! $validBuckets->contains($bucket)) {
            $bucket = '';
        }

        $debtors = $receivables['debtors']
            ->when($search !== '', function ($rows) use ($search) {
                $needle = Str::lower($search);

                return $rows->filter(fn (array $debtor): bool => collect([
                    $debtor['client'],
                    $debtor['client_no'],
                    $debtor['account_no'],
                    $debtor['branch'],
                    $debtor['phone'],
                ])->filter()->contains(fn (string $value): bool => str_contains(Str::lower($value), $needle)));
            })
            ->when($bucket !== '', fn ($rows) => $rows->filter(fn (array $debtor): bool => $debtor['aging'][$bucket] > 0))
            ->values();

        $requestedAccount = (int) $request->integer('account');
        $selectedDebtor = $debtors->firstWhere('account_id', $requestedAccount) ?? $debtors->first();
        $selectedAccount = $selectedDebtor ? (int) $selectedDebtor['account_id'] : null;
        $statement = $selectedDebtor
            ? $this->accounting->debtorStatement(
                $request->user(),
                $selectedAccount,
                $selectedDebtor,
                (int) $request->session()->get(BranchAccessService::SESSION_KEY),
            )
            : null;

        $page = max(1, (int) $request->integer('page', 1));
        $perPage = 15;
        $paginator = new LengthAwarePaginator(
            $debtors->forPage($page, $perPage)->values(),
            $debtors->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('accounting/debtors', [
            'summary' => $receivables['summary'],
            'aging' => $receivables['aging'],
            'currency' => $receivables['currency'],
            'debtors' => $paginator,
            'statement' => $statement,
            'filters' => ['search' => $search, 'bucket' => $bucket, 'account' => $selectedAccount],
        ]);
    }

    public function generalLedger(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['all', 'draft', 'posted', 'reversed'])],
            'type' => ['nullable', 'string', 'max:30'],
        ]);
        $journals = $this->ledger->journalQuery($request->user())
            ->with(['branch:id,name', 'creator:id,name', 'lines.account:id,code,name'])
            ->when(filled($filters['search'] ?? null), fn ($query) => $query->where(fn ($nested) => $nested
                ->where('journal_no', 'like', '%'.$filters['search'].'%')->orWhere('reference', 'like', '%'.$filters['search'].'%')->orWhere('description', 'like', '%'.$filters['search'].'%')))
            ->when(filled($filters['status'] ?? null) && $filters['status'] !== 'all', fn ($query) => $query->where('status', $filters['status']))
            ->when(filled($filters['type'] ?? null) && $filters['type'] !== 'all', fn ($query) => $query->where('journal_type', $filters['type']))
            ->latest('entry_date')->latest('id')->paginate(20)->withQueryString()->through(fn (JournalEntry $journal) => [
                'id' => $journal->id, 'journal_no' => $journal->journal_no, 'journal_type' => $journal->journal_type,
                'entry_date' => $journal->entry_date->toDateString(), 'reference' => $journal->reference, 'description' => $journal->description,
                'currency_code' => $journal->currency_code, 'status' => $journal->status, 'branch' => $journal->branch?->name, 'creator' => $journal->creator?->name,
                'total' => (float) $journal->lines->sum('debit'),
                'lines' => $journal->lines->map(fn ($line) => ['id' => $line->id, 'account' => $line->account?->code.' · '.$line->account?->name, 'description' => $line->description, 'debit' => (float) $line->debit, 'credit' => (float) $line->credit])->all(),
            ]);
        $accounts = GlAccount::query()->where('organization_id', $request->user()->organization_id)->orderBy('code')->get();

        return Inertia::render('accounting/general-ledger', [
            'accounts' => $accounts->map(fn (GlAccount $account) => ['id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'type' => $account->type, 'subtype' => $account->subtype, 'normal_balance' => $account->normal_balance, 'control_account' => $account->control_account, 'allow_manual_posting' => $account->allow_manual_posting, 'active' => $account->active]),
            'manualAccounts' => $accounts->where('active', true)->where('allow_manual_posting', true)->map(fn (GlAccount $account) => ['value' => (string) $account->id, 'label' => $account->code.' · '.$account->name])->values(),
            'branches' => $this->ledger->accessibleBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name])->values(),
            'dimensions' => AccountingDimension::query()->where('organization_id', $request->user()->organization_id)->where('active', true)->orderBy('kind')->orderBy('code')->get()->map(fn ($dimension) => ['value' => (string) $dimension->id, 'label' => str($dimension->kind)->headline().' · '.$dimension->code.' · '.$dimension->name]),
            'journals' => $journals,
            'filters' => ['search' => $filters['search'] ?? '', 'status' => $filters['status'] ?? 'all', 'type' => $filters['type'] ?? 'all'],
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
            'permissions' => ['manage' => $request->user()->can('accounting.manage'), 'post' => $request->user()->can('accounting.post')],
            'stats' => [
                'accounts' => $accounts->where('active', true)->count(),
                'drafts' => $this->ledger->journalQuery($request->user())->where('status', 'draft')->count(),
                'postedThisMonth' => $this->ledger->journalQuery($request->user())->where('status', 'posted')->whereBetween('entry_date', [today()->startOfMonth(), today()->endOfMonth()])->count(),
                'period' => AccountingPeriod::query()->whereHas('fiscalYear', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->whereDate('starts_on', '<=', today())->whereDate('ends_on', '>=', today())->value('name'),
            ],
        ]);
    }

    public function cashMovement(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'branch_id' => ['nullable', 'integer'],
        ]);
        $from = $validated['from'] ?? today()->startOfMonth()->toDateString();
        $to = $validated['to'] ?? today()->toDateString();
        $branchId = isset($validated['branch_id']) ? (int) $validated['branch_id'] : null;
        if ($branchId && ! $this->ledger->accessibleBranches($request->user())->contains('id', $branchId)) {
            abort(403);
        }

        return Inertia::render('accounting/cash-movement', [
            ...$this->ledger->cashMovement($request->user(), $from, $to, $branchId),
            'filters' => ['from' => $from, 'to' => $to, 'branch_id' => $branchId],
            'branches' => $this->ledger->accessibleBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name])->values(),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
        ]);
    }

    public function interestReview(Request $request): Response
    {
        $review = $this->interest->review($request->user());

        return Inertia::render('accounting/interest-review', [
            ...$review,
            'accountOptions' => $this->interest->accounts($request->user())->map(fn ($account) => [
                'value' => (string) $account->id,
                'label' => $account->account_no.' · '.($account->clientFile?->client?->search_name ?? 'Unknown client'),
            ])->values(),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
            'permissions' => ['manage' => $request->user()->can('accounting.manage')],
        ]);
    }

    public function updateInterestPolicy(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'base_annual_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'grace_days' => ['required', 'integer', 'min:0', 'max:365'],
            'merit_window_months' => ['required', 'integer', 'min:1', 'max:36'],
            'merit_exemption_threshold' => ['required', 'numeric', 'min:0', 'max:100'],
            'merit_discount_threshold' => ['required', 'numeric', 'min:0', 'max:100', 'lte:merit_exemption_threshold'],
            'discounted_annual_rate' => ['required', 'numeric', 'min:0', 'max:100', 'lte:base_annual_rate'],
            'minimum_overdue_balance' => ['required', 'numeric', 'min:0'],
            'active' => ['required', 'boolean'],
        ]);
        $policy = $this->interest->policy((int) $request->user()->organization_id);
        $before = $policy->only(array_keys($validated));
        $policy->forceFill([...$validated, 'updated_by' => $request->user()->id])->save();
        $this->auditLogger->record($request, 'accounting.interest-policy-updated', $policy, $before, $policy->only(array_keys($validated)));

        return back()->with('success', 'Interest and payment-merit policy updated.');
    }

    public function storeInterestExemption(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $allowedAccountIds = $this->interest->accounts($request->user())->pluck('id');
        $validated = $request->validate([
            'client_account_id' => ['required', Rule::in($allowedAccountIds)],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'rate_override' => ['required', 'numeric', 'min:0', 'max:100'],
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
        ]);
        InterestExemption::query()->where('client_account_id', $validated['client_account_id'])->where('status', 'active')->update(['status' => 'superseded']);
        $exemption = InterestExemption::query()->create([...$validated, 'status' => 'active', 'approved_by' => $request->user()->id]);
        $this->auditLogger->record($request, 'accounting.interest-exemption-approved', $exemption, null, $validated);

        return back()->with('success', 'Interest exemption or override approved for the account.');
    }

    public function revokeInterestExemption(InterestExemption $interestExemption, Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        abort_unless($interestExemption->account()->whereHas('clientFile.client', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->exists(), 404);
        $interestExemption->forceFill(['status' => 'revoked'])->save();
        $this->auditLogger->record($request, 'accounting.interest-exemption-revoked', $interestExemption, ['status' => 'active'], ['status' => 'revoked']);

        return back()->with('success', 'Interest exemption revoked.');
    }

    public function storeJournal(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = $request->user()->organization_id;
        $branchIds = $this->ledger->accessibleBranches($request->user())->pluck('id');
        $validated = $request->validate([
            'branch_id' => ['nullable', Rule::in($branchIds)],
            'entry_date' => ['required', 'date'],
            'journal_type' => ['required', Rule::in(['general', 'cashbook', 'accrual', 'adjustment', 'opening'])],
            'reference' => ['nullable', 'string', 'max:120'],
            'description' => ['required', 'string', 'max:1000'],
            'currency_code' => ['required', Rule::exists('currencies', 'code')],
            'exchange_rate' => ['required', 'numeric', 'gt:0'],
            'lines' => ['required', 'array', 'min:2', 'max:100'],
            'lines.*.gl_account_id' => ['required', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)->where('active', true)->where('allow_manual_posting', true)],
            'lines.*.accounting_dimension_id' => ['nullable', Rule::exists('accounting_dimensions', 'id')->where('organization_id', $organizationId)->where('active', true)],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);
        $journal = $this->ledger->createDraft($request->user(), $validated);
        $this->auditLogger->record($request, 'accounting.journal-created', $journal, null, ['journal_no' => $journal->journal_no, 'total' => (float) $journal->lines->sum('debit')]);

        return back()->with('success', "Journal {$journal->journal_no} saved as a balanced draft.");
    }

    public function postJournal(JournalEntry $journalEntry, Request $request): RedirectResponse
    {
        $this->authorizeJournal($journalEntry, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        $this->ledger->post($journalEntry, $request->user());
        $this->auditLogger->record($request, 'accounting.journal-posted', $journalEntry, ['status' => 'draft'], ['status' => 'posted']);

        return back()->with('success', "Journal {$journalEntry->journal_no} posted to the general ledger.");
    }

    public function reverseJournal(JournalEntry $journalEntry, Request $request): RedirectResponse
    {
        $this->authorizeJournal($journalEntry, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        $validated = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $reversal = $this->ledger->reverse($journalEntry, $request->user(), $validated['reason']);
        $this->auditLogger->record($request, 'accounting.journal-reversed', $journalEntry, ['status' => 'posted'], ['status' => 'reversed', 'reversal_id' => $reversal->id]);

        return back()->with('success', "Journal {$journalEntry->journal_no} reversed by {$reversal->journal_no}.");
    }

    public function reports(Request $request): Response
    {
        $validated = $request->validate([
            'report' => ['nullable', Rule::in(['trial-balance', 'general-ledger', 'income-statement', 'balance-sheet', 'cash-flow', 'comparative-income', 'monthly-performance', 'budget-variance', 'control-reconciliation'])],
            'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'],
            'branch_id' => ['nullable', 'integer'],
        ]);
        $report = $validated['report'] ?? 'trial-balance';
        $from = $validated['from'] ?? today()->startOfYear()->toDateString();
        $to = $validated['to'] ?? today()->toDateString();
        $branchId = isset($validated['branch_id']) ? (int) $validated['branch_id'] : null;
        if ($branchId && ! $this->ledger->accessibleBranches($request->user())->contains('id', $branchId)) {
            abort(403);
        }

        return Inertia::render('accounting/reports', [
            'report' => $this->ledger->report($request->user(), $report, $from, $to, $branchId),
            'filters' => ['report' => $report, 'from' => $from, 'to' => $to, 'branch_id' => $branchId],
            'branches' => $this->ledger->accessibleBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name])->values(),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
        ]);
    }

    public function exportReport(Request $request, string $format, FinancialReportWorkbook $workbook): BinaryFileResponse|HttpResponse
    {
        abort_unless(in_array($format, ['pdf', 'excel'], true), 404);
        $validated = $request->validate([
            'report' => ['nullable', Rule::in(['trial-balance', 'general-ledger', 'income-statement', 'balance-sheet', 'cash-flow', 'comparative-income', 'monthly-performance', 'budget-variance', 'control-reconciliation'])],
            'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'], 'branch_id' => ['nullable', 'integer'],
        ]);
        $type = $validated['report'] ?? 'trial-balance';
        $from = $validated['from'] ?? today()->startOfYear()->toDateString();
        $to = $validated['to'] ?? today()->toDateString();
        $branchId = isset($validated['branch_id']) ? (int) $validated['branch_id'] : null;
        if ($branchId && ! $this->ledger->accessibleBranches($request->user())->contains('id', $branchId)) {
            abort(403);
        }
        $titles = ['trial-balance' => 'Trial Balance', 'general-ledger' => 'General Ledger', 'income-statement' => 'Income Statement', 'balance-sheet' => 'Balance Sheet', 'cash-flow' => 'Cash Flow Statement', 'comparative-income' => 'Comparative Income Statement', 'monthly-performance' => 'Monthly Performance', 'budget-variance' => 'Budget versus Actual', 'control-reconciliation' => 'Control Account Reconciliation'];
        $data = ['title' => $titles[$type], 'organization' => $request->user()->organization?->trading_name ?? 'Alpha Land', 'from' => $from, 'to' => $to, 'report' => $this->ledger->report($request->user(), $type, $from, $to, $branchId)];
        $filename = str($type)->slug().'-'.$to;
        if ($format === 'pdf') {
            return Pdf::loadView('reports.financial-statement', $data)->setPaper('a4', 'landscape')->download($filename.'.pdf');
        }
        $path = $workbook->create($data);

        return response()->download($path, $filename.'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])->deleteFileAfterSend(true);
    }

    public function settings(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $controlSetting = SystemSetting::query()
            ->where('organization_id', $organizationId)
            ->whereNull('branch_id')
            ->where('setting_key', 'accounting.control')
            ->whereNull('effective_to')
            ->latest('effective_from')
            ->first();
        $control = $controlSetting?->value_json ?? [];
        $taxCodes = TaxCode::query()
            ->where('organization_id', $organizationId)
            ->with(['inputAccount:id,code,name', 'outputAccount:id,code,name'])
            ->orderBy('code')
            ->get();
        $defaultTaxCode = $control['default_tax_code'] ?? null;
        if (! $taxCodes->contains(fn (TaxCode $taxCode): bool => $taxCode->active && $taxCode->code === $defaultTaxCode)) {
            $defaultTaxCode = $taxCodes->firstWhere('active', true)?->code;
        }

        return Inertia::render('accounting/settings', [
            'fiscalYears' => FiscalYear::query()->where('organization_id', $organizationId)->with(['periods' => fn ($query) => $query->orderBy('period_number')])->latest('starts_on')->get(),
            'taxCodes' => $taxCodes,
            'accounts' => GlAccount::query()->where('organization_id', $organizationId)->orderBy('code')->get(['id', 'code', 'name']),
            'currencies' => Currency::query()->where('active', true)->orderBy('code')->get(['code', 'name', 'symbol', 'decimal_places']),
            'accountingSettings' => [
                'base_currency_code' => $request->user()->organization?->base_currency_code ?? 'USD',
                'fiscal_year_start_month' => (int) ($control['fiscal_year_start_month'] ?? 1),
                'default_tax_code' => $defaultTaxCode,
                'default_payment_terms_days' => (int) ($control['default_payment_terms_days'] ?? 30),
                'journal_prefix' => $control['journal_prefix'] ?? 'JRN',
                'source_posting_mode' => $control['source_posting_mode'] ?? 'automatic',
                'updated_at' => $controlSetting?->effective_from?->toISOString(),
            ],
            'permissions' => ['manage' => $request->user()->can('accounting.manage'), 'closePeriod' => $request->user()->can('accounting.close-period')],
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = $request->user()->organization_id;
        $validated = $request->validate([
            'base_currency_code' => ['required', 'string', 'size:3', Rule::exists('currencies', 'code')->where('active', true)],
            'fiscal_year_start_month' => ['required', 'integer', 'between:1,12'],
            'default_tax_code' => ['nullable', 'string', Rule::exists('tax_codes', 'code')->where('organization_id', $organizationId)],
            'default_payment_terms_days' => ['required', 'integer', 'between:0,365'],
            'journal_prefix' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9-]+$/'],
            'source_posting_mode' => ['required', Rule::in(['automatic', 'manual'])],
        ]);
        $organization = $request->user()->organization;
        abort_unless($organization, 404);

        DB::transaction(function () use ($request, $validated, $organization, $organizationId): void {
            $current = SystemSetting::query()
                ->where('organization_id', $organizationId)
                ->whereNull('branch_id')
                ->where('setting_key', 'accounting.control')
                ->whereNull('effective_to')
                ->latest('effective_from')
                ->lockForUpdate()
                ->first();
            $before = [
                'base_currency_code' => $organization->base_currency_code,
                ...($current?->value_json ?? []),
            ];
            $effectiveAt = now();
            $current?->forceFill(['effective_to' => $effectiveAt])->save();
            $organization->forceFill(['base_currency_code' => $validated['base_currency_code']])->save();
            $setting = SystemSetting::query()->create([
                'organization_id' => $organizationId,
                'branch_id' => null,
                'setting_key' => 'accounting.control',
                'value_json' => collect($validated)->except('base_currency_code')->all(),
                'data_type' => 'json',
                'effective_from' => $effectiveAt,
                'created_by' => $request->user()->id,
            ]);
            $this->auditLogger->record($request, 'accounting.settings-updated', $setting, $before, $validated);
        });

        return back()->with('success', 'Accounting controls updated.');
    }

    public function updatePeriod(AccountingPeriod $accountingPeriod, Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.close-period'), 403);
        abort_unless((int) $accountingPeriod->fiscalYear?->organization_id === (int) $request->user()->organization_id, 404);
        $validated = $request->validate(['status' => ['required', Rule::in(['open', 'closed'])]]);
        if ($validated['status'] === 'closed' && JournalEntry::query()->where('accounting_period_id', $accountingPeriod->id)->where('status', 'draft')->exists()) {
            throw ValidationException::withMessages(['period' => 'Post or remove all draft journals before closing this period.']);
        }
        $before = ['status' => $accountingPeriod->status];
        $accountingPeriod->forceFill(['status' => $validated['status'], 'closed_at' => $validated['status'] === 'closed' ? now() : null, 'closed_by' => $validated['status'] === 'closed' ? $request->user()->id : null])->save();
        $this->auditLogger->record($request, 'accounting.period-'.$validated['status'], $accountingPeriod, $before, ['status' => $validated['status']]);

        return back()->with('success', "Accounting period {$accountingPeriod->name} is now {$validated['status']}.");
    }

    public function storeTaxCode(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = $request->user()->organization_id;
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('tax_codes')->where('organization_id', $organizationId)],
            'name' => ['required', 'string', 'max:80'], 'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'type' => ['required', Rule::in(['vat', 'zero', 'exempt', 'withholding'])],
            'input_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)],
            'output_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)],
        ]);
        $taxCode = TaxCode::query()->create([...$validated, 'organization_id' => $organizationId, 'active' => true]);
        $this->auditLogger->record($request, 'accounting.tax-code-created', $taxCode, null, $validated);

        return back()->with('success', "Tax code {$taxCode->code} created.");
    }

    public function updateTaxCode(TaxCode $taxCode, Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = $request->user()->organization_id;
        abort_unless((int) $taxCode->organization_id === (int) $organizationId, 404);
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('tax_codes')->where('organization_id', $organizationId)->ignore($taxCode->id)],
            'name' => ['required', 'string', 'max:80'], 'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'type' => ['required', Rule::in(['vat', 'zero', 'exempt', 'withholding'])],
            'input_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)],
            'output_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)],
            'active' => ['required', 'boolean'],
        ]);
        $before = $taxCode->only(['code', 'name', 'rate', 'type', 'input_account_id', 'output_account_id', 'active']);
        $taxCode->update($validated);
        $this->auditLogger->record($request, 'accounting.tax-code-updated', $taxCode, $before, $validated);

        return back()->with('success', "Tax code {$taxCode->code} updated.");
    }

    public function syncSourceDocuments(Request $request, SourceDocumentPostingService $posting): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.post'), 403);
        AccountCharge::query()->whereHas('account.clientFile.client', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->each(fn ($charge) => $posting->postCharge($charge));
        Payment::query()->whereHas('account.clientFile.client', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->each(fn ($payment) => $posting->postPayment($payment));
        Expense::query()->whereHas('branch', fn ($query) => $query->where('organization_id', $request->user()->organization_id))->each(fn ($expense) => $posting->postExpense($expense));

        return back()->with('success', 'Posted source documents have been synchronized to the general ledger.');
    }

    private function authorizeJournal(JournalEntry $journal, Request $request): void
    {
        abort_unless((int) $journal->organization_id === (int) $request->user()->organization_id, 404);
        if ($journal->branch_id && ! $this->ledger->accessibleBranches($request->user())->contains('id', $journal->branch_id)) {
            abort(404);
        }
    }
}
