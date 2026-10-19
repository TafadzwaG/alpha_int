<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierBill;
use App\Models\SupplierPayment;
use App\Models\SupplierReconciliation;
use App\Models\SupplierReconciliationLine;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\SupplierReconciliationService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SupplierReconciliationController extends Controller
{
    public function __construct(
        private readonly SupplierReconciliationService $service,
        private readonly BranchAccessService $branchAccess,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $organizationId = (int) $request->user()->organization_id;
        $branchIds = $this->branchAccess->branchIds($request->user());
        $reconciliations = SupplierReconciliation::query()->where('organization_id', $organizationId)
            ->when($branchIds !== null, fn ($query) => $query->where(fn ($nested) => $nested->whereNull('branch_id')->orWhereIn('branch_id', $branchIds)))
            ->with(['supplier:id,supplier_no,name', 'branch:id,name', 'preparer:id,name', 'approver:id,name'])
            ->withCount(['lines', 'lines as unmatched_lines_count' => fn ($query) => $query->where('match_status', 'unmatched')])
            ->latest('statement_date')->get();
        $selected = null;
        if ($request->filled('reconciliation')) {
            $selected = SupplierReconciliation::query()->where('organization_id', $organizationId)->with(['supplier:id,supplier_no,name', 'branch:id,name', 'lines'])->findOrFail($request->integer('reconciliation'));
            $this->authorizeReconciliation($selected, $request);
            // Signed-off reconciliations are historical control evidence. Keep their
            // recorded ledger balance and variance immutable after approval.
            if ($selected->status !== 'reconciled') {
                $selected = $this->service->refresh($selected);
            }
            $selected = $selected->load(['supplier:id,supplier_no,name', 'branch:id,name', 'lines']);
            $selected->lines->each(function (SupplierReconciliationLine $line): void {
                $line->setAttribute('match_label', match ($line->match_type) {
                    SupplierBill::class => SupplierBill::query()->whereKey($line->match_id)->value('bill_no'),
                    SupplierPayment::class => SupplierPayment::query()->whereKey($line->match_id)->value('reference'),
                    default => null,
                });
            });
        }
        $candidateBills = $selected ? SupplierBill::query()->where('organization_id', $organizationId)->where('supplier_id', $selected->supplier_id)
            ->when($selected->branch_id, fn ($query) => $query->where('branch_id', $selected->branch_id))->whereIn('status', ['posted', 'partially_paid', 'paid', 'overdue'])
            ->orderByDesc('bill_date')->get()->map(fn ($bill) => ['value' => 'bill:'.$bill->id, 'label' => $bill->bill_no.' · '.number_format((float) $bill->total_amount, 2).' · '.$bill->bill_date->format('d M Y')]) : collect();
        $candidatePayments = $selected ? SupplierPayment::query()->whereHas('bill', fn ($query) => $query->where('organization_id', $organizationId)->where('supplier_id', $selected->supplier_id)
            ->when($selected->branch_id, fn ($inner) => $inner->where('branch_id', $selected->branch_id)))->orderByDesc('payment_date')->get()
            ->map(fn ($payment) => ['value' => 'payment:'.$payment->id, 'label' => $payment->reference.' · -'.number_format((float) $payment->amount, 2).' · '.$payment->payment_date->format('d M Y')]) : collect();

        return Inertia::render('accounting/supplier-reconciliation', [
            'reconciliations' => $reconciliations,
            'selected' => $selected,
            'matchOptions' => $candidateBills->concat($candidatePayments)->values(),
            'suppliers' => Supplier::query()->where('organization_id', $organizationId)->where('status', 'active')->orderBy('name')->get(['id', 'supplier_no', 'name', 'currency_code']),
            'branches' => $this->branchAccess->availableBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name])->values(),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
            'permissions' => ['manage' => $request->user()->can('accounting.manage'), 'post' => $request->user()->can('accounting.post')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $organizationId = (int) $request->user()->organization_id;
        $branchValues = $this->branchAccess->availableBranches($request->user())->pluck('id');
        $validated = $request->validate([
            'supplier_id' => ['required', Rule::exists('suppliers', 'id')->where('organization_id', $organizationId)->where('status', 'active')],
            'branch_id' => ['nullable', Rule::in($branchValues)], 'statement_no' => ['required', 'string', 'max:80'], 'statement_date' => ['required', 'date'],
            'from_date' => ['required', 'date'], 'to_date' => ['required', 'date', 'after_or_equal:from_date'], 'currency_code' => ['required', 'string', 'size:3'],
            'opening_balance' => ['required', 'numeric'], 'statement_balance' => ['required', 'numeric'], 'notes' => ['nullable', 'string', 'max:2000'],
            'statement' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);
        $supplier = Supplier::query()->where('organization_id', $organizationId)->findOrFail($validated['supplier_id']);
        if ($supplier->currency_code !== $validated['currency_code']) {
            throw ValidationException::withMessages(['currency_code' => 'The statement currency must match the supplier master file.']);
        }
        $handle = fopen($validated['statement']->getRealPath(), 'r');
        $headers = array_map(fn ($value) => Str::snake(trim((string) $value)), fgetcsv($handle) ?: []);
        foreach (['date', 'description', 'amount'] as $required) {
            if (! in_array($required, $headers, true)) {
                throw ValidationException::withMessages(['statement' => 'CSV headers must include date, description and amount. Optional: type and reference.']);
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
            $rows[] = [
                'transaction_date' => $date, 'transaction_type' => Str::lower(trim($row['type'] ?? ($amount >= 0 ? 'invoice' : 'payment'))),
                'reference' => trim($row['reference'] ?? '') ?: null, 'description' => trim($row['description']), 'amount' => $amount,
                'line_hash' => hash('sha256', implode('|', [$date, $row['reference'] ?? '', $row['description'], number_format($amount, 4, '.', '')])),
                'match_status' => 'unmatched',
            ];
        }
        fclose($handle);
        if (! $rows) {
            throw ValidationException::withMessages(['statement' => 'The supplier statement contains no readable transaction rows.']);
        }
        $reconciliation = DB::transaction(function () use ($request, $validated, $organizationId, $rows): SupplierReconciliation {
            $record = SupplierReconciliation::query()->create([
                ...collect($validated)->except('statement')->all(), 'organization_id' => $organizationId,
                'original_filename' => $validated['statement']->getClientOriginalName(), 'status' => 'in_review', 'prepared_by' => $request->user()->id,
            ]);
            $record->lines()->createMany($rows);

            return $this->service->refresh($record);
        });
        $this->audit->record($request, 'accounting.supplier-reconciliation-imported', $reconciliation, null, ['lines' => count($rows), 'variance' => (float) $reconciliation->variance]);

        return redirect('/accounting/supplier-reconciliation?reconciliation='.$reconciliation->id)->with('success', count($rows).' supplier statement lines imported.');
    }

    public function autoMatch(SupplierReconciliation $supplierReconciliation, Request $request): RedirectResponse
    {
        $this->authorizeReconciliation($supplierReconciliation, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $matched = $this->service->autoMatch($supplierReconciliation, $request->user());

        return back()->with('success', "{$matched} supplier statement lines matched.");
    }

    public function match(SupplierReconciliationLine $supplierReconciliationLine, Request $request): RedirectResponse
    {
        $supplierReconciliationLine->load('reconciliation');
        $this->authorizeReconciliation($supplierReconciliationLine->reconciliation, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $validated = $request->validate(['target' => ['required', 'string', 'regex:/^(bill|payment):[0-9]+$/']]);
        [$type, $id] = explode(':', $validated['target']);
        $this->service->match($supplierReconciliationLine, $type, (int) $id, $request->user());

        return back()->with('success', 'Supplier statement line matched.');
    }

    public function exception(SupplierReconciliationLine $supplierReconciliationLine, Request $request): RedirectResponse
    {
        $supplierReconciliationLine->load('reconciliation');
        $this->authorizeReconciliation($supplierReconciliationLine->reconciliation, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $validated = $request->validate(['resolution_note' => ['required', 'string', 'min:10', 'max:1000']]);
        $this->service->resolveException($supplierReconciliationLine, $validated['resolution_note'], $request->user());

        return back()->with('success', 'Supplier statement exception documented.');
    }

    public function reopenLine(SupplierReconciliationLine $supplierReconciliationLine, Request $request): RedirectResponse
    {
        $supplierReconciliationLine->load('reconciliation');
        $this->authorizeReconciliation($supplierReconciliationLine->reconciliation, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $this->service->reopenLine($supplierReconciliationLine);

        return back()->with('success', 'Statement line returned to unmatched.');
    }

    public function approve(SupplierReconciliation $supplierReconciliation, Request $request): RedirectResponse
    {
        $this->authorizeReconciliation($supplierReconciliation, $request);
        abort_unless($request->user()->can('accounting.post'), 403);
        $approved = $this->service->approve($supplierReconciliation, $request->user());
        $this->audit->record($request, 'accounting.supplier-reconciliation-approved', $approved, ['status' => 'in_review'], ['status' => 'reconciled', 'variance' => (float) $approved->variance]);

        return back()->with('success', "Supplier reconciliation {$approved->statement_no} signed off.");
    }

    private function authorizeReconciliation(SupplierReconciliation $reconciliation, Request $request): void
    {
        abort_unless((int) $reconciliation->organization_id === (int) $request->user()->organization_id, 404);
        if ($reconciliation->branch_id && ! $this->branchAccess->canAccess($request->user(), (int) $reconciliation->branch_id)) {
            abort(404);
        }
    }
}
