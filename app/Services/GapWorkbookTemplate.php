<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class GapWorkbookTemplate
{
    public function store(UploadedFile $workbook, int $organizationId): bool
    {
        $reader = IOFactory::createReaderForFile($workbook->getRealPath());
        $reader->setReadDataOnly(false);
        $spreadsheet = $reader->load($workbook->getRealPath());
        $requiredSheets = ['RECIEPTS', 'ON GROUND', 'DOUBLE ALLOCATION', 'WAITING LIST', 'STATISTICS'];
        $compatible = collect($requiredSheets)->every(fn (string $sheet) => $spreadsheet->getSheetByName($sheet) !== null)
            && collect(['ON GROUND', 'DOUBLE ALLOCATION', 'WAITING LIST'])
                ->every(fn (string $sheet) => $spreadsheet->getSheetByName($sheet)?->getTableCollection()->count() >= 1);
        $spreadsheet->disconnectWorksheets();

        if (! $compatible) {
            return false;
        }

        $contents = file_get_contents($workbook->getRealPath());
        if ($contents === false || ! Storage::disk('local')->put($this->storageKey($organizationId), $contents)) {
            throw new RuntimeException('The GAPS workbook template could not be saved.');
        }

        return true;
    }

    public function path(int $organizationId): string
    {
        $key = $this->storageKey($organizationId);
        if (Storage::disk('local')->exists($key)) {
            return Storage::disk('local')->path($key);
        }

        $bundled = resource_path('templates/gaps-index-template.xlsx');
        if (! is_file($bundled)) {
            throw new RuntimeException('The GAPS workbook template is not available.');
        }

        return $bundled;
    }

    private function storageKey(int $organizationId): string
    {
        return "gaps-templates/organization-{$organizationId}.xlsx";
    }
}
