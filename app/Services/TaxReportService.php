<?php

namespace App\Services;

use App\Models\CustomerInvoiceLine;
use App\Models\SalesDocumentLine;
use App\Models\SupplierBillLine;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TaxReportService
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function report(User $user, string $from, string $to, ?int $branchId = null, ?string $taxCode = null): array
    {
        $branchIds = $this->branchAccess->branchIds($user);
        $sales = CustomerInvoiceLine::query()
            ->whereHas('invoice', fn ($query) => $query->where('organization_id', $user->organization_id)
                ->whereIn('status', ['posted', 'partially_paid', 'paid'])
                ->whereBetween('invoice_date', [$from, $to])
                ->when($branchIds !== null, fn ($inner) => $inner->whereIn('branch_id', $branchIds))
                ->when($branchId, fn ($inner) => $inner->where('branch_id', $branchId)))
            ->when($taxCode, fn ($query) => $query->where('tax_code', $taxCode))
            ->with(['invoice.account.clientFile.client:id,first_name,last_name', 'invoice.branch:id,name'])
            ->get()
            ->map(fn ($line) => [
                'date' => $line->invoice->invoice_date->toDateString(), 'source' => 'Sales invoice', 'document_no' => $line->invoice->invoice_no,
                'counterparty' => trim($line->invoice->account?->clientFile?->client?->first_name.' '.$line->invoice->account?->clientFile?->client?->last_name),
                'branch' => $line->invoice->branch?->name, 'tax_code' => $line->tax_code ?: 'NO-TAX', 'description' => $line->description,
                'taxable_amount' => (float) $line->line_subtotal, 'input_tax' => 0.0, 'output_tax' => (float) $line->tax_amount,
            ]);
        $lifecycleSales = SalesDocumentLine::query()
            ->whereHas('document', fn ($query) => $query->where('organization_id', $user->organization_id)
                ->where('status', 'posted')->whereIn('document_type', ['invoice', 'debit_note', 'credit_note', 'sales_return'])
                ->whereBetween('document_date', [$from, $to])
                ->when($branchIds !== null, fn ($inner) => $inner->whereIn('branch_id', $branchIds))
                ->when($branchId, fn ($inner) => $inner->where('branch_id', $branchId)))
            ->when($taxCode, fn ($query) => $query->where('tax_code', $taxCode))
            ->with(['document.account.clientFile.client:id,first_name,last_name', 'document.branch:id,name'])
            ->get()->map(function ($line): array {
                $credit = in_array($line->document->document_type, ['credit_note', 'sales_return'], true);
                $sign = $credit ? -1 : 1;
                return [
                    'date' => $line->document->document_date->toDateString(), 'source' => str($line->document->document_type)->headline()->toString(),
                    'document_no' => $line->document->document_no,
                    'counterparty' => trim($line->document->account?->clientFile?->client?->first_name.' '.$line->document->account?->clientFile?->client?->last_name),
                    'branch' => $line->document->branch?->name, 'tax_code' => $line->tax_code ?: 'NO-TAX', 'description' => $line->description,
                    'taxable_amount' => $sign * (float) $line->line_subtotal, 'input_tax' => 0.0, 'output_tax' => $sign * (float) $line->tax_amount,
                ];
            });
        $sales = $sales->concat($lifecycleSales);
        $purchases = SupplierBillLine::query()
            ->whereHas('bill', fn ($query) => $query->where('organization_id', $user->organization_id)
                ->whereIn('status', ['posted', 'partially_paid', 'paid', 'overdue'])
                ->whereBetween('bill_date', [$from, $to])
                ->when($branchIds !== null, fn ($inner) => $inner->whereIn('branch_id', $branchIds))
                ->when($branchId, fn ($inner) => $inner->where('branch_id', $branchId)))
            ->when($taxCode, fn ($query) => $query->where('tax_code', $taxCode))
            ->with(['bill.supplier:id,name', 'bill.branch:id,name'])
            ->get()
            ->map(fn ($line) => [
                'date' => $line->bill->bill_date->toDateString(), 'source' => 'Supplier bill', 'document_no' => $line->bill->bill_no,
                'counterparty' => $line->bill->supplier?->name, 'branch' => $line->bill->branch?->name, 'tax_code' => $line->tax_code ?: 'NO-TAX',
                'description' => $line->description, 'taxable_amount' => (float) $line->line_subtotal,
                'input_tax' => (float) $line->tax_amount, 'output_tax' => 0.0,
            ]);
        $rows = $sales->concat($purchases)->sortBy(fn (array $row) => $row['date'].'-'.$row['document_no'])->values();
        $outputTax = round((float) $sales->sum('output_tax'), 4);
        $inputTax = round((float) $purchases->sum('input_tax'), 4);

        $controls = DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('gl_accounts', 'gl_accounts.id', '=', 'journal_lines.gl_account_id')
            ->where('journal_entries.organization_id', $user->organization_id)
            ->where('journal_entries.status', 'posted')
            ->whereBetween('journal_entries.entry_date', [$from, $to])
            ->whereIn('gl_accounts.system_key', ['vat_input', 'vat_output'])
            ->when($branchIds !== null, fn ($query) => $query->whereIn('journal_entries.branch_id', $branchIds))
            ->when($branchId, fn ($query) => $query->where('journal_entries.branch_id', $branchId))
            ->selectRaw('gl_accounts.system_key, SUM(journal_lines.base_debit) debit, SUM(journal_lines.base_credit) credit')
            ->groupBy('gl_accounts.system_key')->get()->keyBy('system_key');
        // Journal lines do not carry a tax-code dimension. A code-filtered report can
        // therefore show the statutory detail, but must not imply that it reconciles
        // to a whole-account GL control balance.
        $controlOutput = $taxCode ? null : round((float) (($controls['vat_output']->credit ?? 0) - ($controls['vat_output']->debit ?? 0)), 4);
        $controlInput = $taxCode ? null : round((float) (($controls['vat_input']->debit ?? 0) - ($controls['vat_input']->credit ?? 0)), 4);

        return [
            'rows' => $rows,
            'byCode' => $rows->groupBy('tax_code')->map(fn ($items, string $code) => [
                'tax_code' => $code, 'taxable_amount' => round((float) $items->sum('taxable_amount'), 4),
                'input_tax' => round((float) $items->sum('input_tax'), 4), 'output_tax' => round((float) $items->sum('output_tax'), 4),
                'transactions' => $items->count(),
            ])->values(),
            'summary' => [
                'taxable_sales' => round((float) $sales->sum('taxable_amount'), 4), 'taxable_purchases' => round((float) $purchases->sum('taxable_amount'), 4),
                'output_tax' => $outputTax, 'input_tax' => $inputTax, 'net_tax' => round($outputTax - $inputTax, 4),
                'control_output' => $controlOutput, 'control_input' => $controlInput,
                'output_variance' => $controlOutput === null ? null : round($controlOutput - $outputTax, 4),
                'input_variance' => $controlInput === null ? null : round($controlInput - $inputTax, 4),
                'control_reconciliation_available' => $taxCode === null,
            ],
        ];
    }
}
