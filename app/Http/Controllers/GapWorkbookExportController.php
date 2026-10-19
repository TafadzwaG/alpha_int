<?php

namespace App\Http\Controllers;

use App\Services\GapWorkbookExporter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class GapWorkbookExportController extends Controller
{
    public function __invoke(Request $request, GapWorkbookExporter $exporter): BinaryFileResponse
    {
        abort_unless($request->user()->can('phase-one.view'), 403);
        $request->validate([
            'branch' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:200'],
        ]);

        return response()->download(
            $exporter->export($request),
            $exporter->filename($request),
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        )->deleteFileAfterSend(true);
    }
}
