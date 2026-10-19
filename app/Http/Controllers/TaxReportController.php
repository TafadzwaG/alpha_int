<?php

namespace App\Http\Controllers;

use App\Models\TaxCode;
use App\Services\BranchAccessService;
use App\Services\TaxReportService;
use App\Services\TaxReportWorkbook;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TaxReportController extends Controller
{
    public function __construct(private readonly TaxReportService $taxReport, private readonly BranchAccessService $branchAccess) {}

    public function index(Request $request): Response
    {
        $validated = $this->filters($request);
        $from = $validated['from'] ?? today()->startOfMonth()->toDateString();
        $to = $validated['to'] ?? today()->toDateString();
        $branchId = isset($validated['branch_id']) ? (int) $validated['branch_id'] : null;
        if ($branchId && ! $this->branchAccess->canAccess($request->user(), $branchId)) {
            abort(403);
        }

        return Inertia::render('accounting/tax-report', [
            'report' => $this->taxReport->report($request->user(), $from, $to, $branchId, $validated['tax_code'] ?? null),
            'filters' => ['from' => $from, 'to' => $to, 'branch_id' => $branchId, 'tax_code' => $validated['tax_code'] ?? null],
            'branches' => $this->branchAccess->availableBranches($request->user())->map(fn ($branch) => ['value' => (string) $branch->id, 'label' => $branch->name])->values(),
            'taxCodes' => TaxCode::query()->where('organization_id', $request->user()->organization_id)->where('active', true)->orderBy('code')->get(['code', 'name', 'rate']),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
        ]);
    }

    public function export(Request $request, TaxReportWorkbook $workbook): BinaryFileResponse
    {
        $validated = $this->filters($request);
        $from = $validated['from'] ?? today()->startOfMonth()->toDateString();
        $to = $validated['to'] ?? today()->toDateString();
        $branchId = isset($validated['branch_id']) ? (int) $validated['branch_id'] : null;
        if ($branchId && ! $this->branchAccess->canAccess($request->user(), $branchId)) {
            abort(403);
        }
        $path = $workbook->create([
            'organization' => $request->user()->organization?->trading_name ?? 'Alpha Land', 'from' => $from, 'to' => $to,
            'report' => $this->taxReport->report($request->user(), $from, $to, $branchId, $validated['tax_code'] ?? null),
        ]);

        return response()->download($path, 'VAT-REPORT-'.$from.'-'.$to.'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])->deleteFileAfterSend(true);
    }

    private function filters(Request $request): array
    {
        return $request->validate([
            'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'], 'branch_id' => ['nullable', 'integer'],
            'tax_code' => ['nullable', Rule::exists('tax_codes', 'code')->where('organization_id', $request->user()->organization_id)->where('active', true)],
        ]);
    }
}
