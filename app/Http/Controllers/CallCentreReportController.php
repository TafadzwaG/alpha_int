<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Services\BranchAccessService;
use App\Services\CallCentreReportService;
use App\Services\CallCentreReportWorkbook;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class CallCentreReportController extends Controller
{
    public function __construct(
        private readonly CallCentreReportService $reports,
        private readonly CallCentreReportWorkbook $workbooks,
        private readonly BranchAccessService $branchAccess,
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('call-centre/reports/index', [
            ...$this->reportFor($request),
            'branches' => $this->availableBranches($request)->map(fn (Branch $branch) => [
                'value' => (string) $branch->id,
                'label' => $branch->name,
                'code' => $branch->code,
            ])->values(),
            'filters' => $this->filters($request),
        ]);
    }

    public function pdf(Request $request): HttpResponse
    {
        $report = $this->reportFor($request);

        return Pdf::loadView('reports.call-centre', $report)
            ->setPaper('a4', 'landscape')
            ->download('alpha-land-call-centre-report-'.now()->format('Y-m-d').'.pdf');
    }

    public function excel(Request $request): BinaryFileResponse
    {
        $path = $this->workbooks->create($this->reportFor($request));

        return response()->download($path, 'alpha-land-call-centre-report-'.now()->format('Y-m-d').'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function reportFor(Request $request): array
    {
        $filters = $this->filters($request);
        $branches = $this->availableBranches($request);
        $branchIds = $filters['branch'] === 'all'
            ? $branches->pluck('id')
            : $branches->where('id', (int) $filters['branch'])->pluck('id');

        abort_if($branchIds->isEmpty(), 404);

        return $this->reports->build(
            $request->user(),
            $branchIds,
            Carbon::parse($filters['from'])->startOfDay(),
            Carbon::parse($filters['to'])->endOfDay(),
        );
    }

    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'branch' => ['nullable', 'string'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return [
            'branch' => $validated['branch'] ?? 'all',
            'from' => $validated['from'] ?? today()->subDays(29)->toDateString(),
            'to' => $validated['to'] ?? today()->toDateString(),
        ];
    }

    private function availableBranches(Request $request): Collection
    {
        $branchIds = $this->branchAccess->branchIds($request->user());

        return Branch::query()
            ->where('organization_id', $request->user()->organization_id)
            ->where('status', 'active')
            ->when($branchIds !== null, fn ($query) => $query->whereIn('id', $branchIds))
            ->orderBy('name')
            ->get();
    }
}
