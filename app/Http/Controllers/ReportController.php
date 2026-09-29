<?php

namespace App\Http\Controllers;

use App\Services\ManagementReportService;
use App\Services\ManagementReportWorkbook;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ManagementReportService $reports,
        private readonly ManagementReportWorkbook $workbooks,
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('reports/index', $this->reportFor($request));
    }

    public function pdf(Request $request): HttpResponse
    {
        $report = $this->reportFor($request);
        $filename = 'alpha-land-management-report-'.now()->format('Y-m-d').'.pdf';

        return Pdf::loadView('reports.management', $report)
            ->setPaper('a4', 'landscape')
            ->download($filename);
    }

    public function excel(Request $request): BinaryFileResponse
    {
        $path = $this->workbooks->create($this->reportFor($request));
        $filename = 'alpha-land-management-report-'.now()->format('Y-m-d').'.xlsx';

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function reportFor(Request $request): array
    {
        return $this->reports->build((int) $request->user()->organization_id);
    }
}
