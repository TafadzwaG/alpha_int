<?php

namespace App\Services;

use App\Models\Receipt;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use RuntimeException;

class GapWorkbookExporter
{
    private const REGISTER_SHEETS = [
        'on_ground' => 'ON GROUND',
        'double_allocation' => 'DOUBLE ALLOCATION',
        'waiting_list' => 'WAITING LIST',
    ];

    private const REGISTER_COLUMNS = [
        'stand_no', 'first_name', 'surname', 'cooperative', 'contacts', 'stand_size',
        'stand_price', 'interest_amount', 'amount_paid', 'balance', 'last_payment_date',
        'register_comment', 'captured_by',
    ];

    public function __construct(
        private readonly GapWorkbookTemplate $templates,
        private readonly GapRegisterView $registers,
        private readonly BranchAccessService $branchAccess,
    ) {}

    public function export(Request $request): string
    {
        $template = $this->templates->path((int) $request->user()->organization_id);
        $reader = IOFactory::createReaderForFile($template);
        $reader->setIncludeCharts(true);
        $workbook = $reader->load($template);

        $this->fillReceipts($workbook, $request);
        foreach (self::REGISTER_SHEETS as $type => $sheetName) {
            $this->fillRegister($workbook, $sheetName, $this->registers->rows($request, $type));
        }

        $workbook->getCalculationEngine()->clearCalculationCache();
        $workbook->setActiveSheetIndexByName('ON GROUND');

        $directory = storage_path('framework/exports');
        if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException('The export directory could not be created.');
        }
        $path = tempnam($directory, 'gaps-export-');
        if ($path === false) {
            throw new RuntimeException('The GAPS workbook export could not be created.');
        }
        $xlsxPath = $path.'.xlsx';
        @unlink($path);

        $writer = IOFactory::createWriter($workbook, 'Xlsx');
        $writer->setIncludeCharts(true);
        $writer->setPreCalculateFormulas(false);
        if ($writer instanceof Xlsx) {
            $writer->setForceFullCalc(true);
        }
        $writer->save($xlsxPath);
        $workbook->disconnectWorksheets();

        return $xlsxPath;
    }

    public function filename(Request $request): string
    {
        $organization = Str::slug((string) ($request->user()->organization?->name ?: 'alpha-land'));

        return 'GAPS-INDEX-'.Str::upper($organization).'-'.now()->format('Y-m-d').'.xlsx';
    }

    private function fillReceipts(Spreadsheet $workbook, Request $request): void
    {
        $sheet = $workbook->getSheetByName('RECIEPTS');
        if (! $sheet) {
            throw new RuntimeException('The template is missing the RECIEPTS sheet.');
        }

        $lastTemplateRow = max(250, $sheet->getHighestRow());
        $this->clearRange($sheet, 'A', 2, 'E', $lastTemplateRow);

        $rows = $this->receiptRows($request);
        foreach ($rows as $offset => $row) {
            $targetRow = 2 + $offset;
            if ($targetRow > $lastTemplateRow) {
                $sheet->duplicateStyle($sheet->getStyle("A{$lastTemplateRow}:E{$lastTemplateRow}"), "A{$targetRow}:E{$targetRow}");
            }
            $this->writeRow($sheet, $targetRow, 'A', $row, [0]);
        }
    }

    /** @param Collection<int,array<string,mixed>> $rows */
    private function fillRegister(Spreadsheet $workbook, string $sheetName, Collection $rows): void
    {
        $sheet = $workbook->getSheetByName($sheetName);
        if (! $sheet) {
            throw new RuntimeException("The template is missing the {$sheetName} sheet.");
        }

        $table = $sheet->getTableCollection()->getIterator()->current();
        if (! $table) {
            throw new RuntimeException("The {$sheetName} sheet does not contain its original data table.");
        }
        [, $end] = explode(':', $table->getRange());
        $dataEndRow = (int) preg_replace('/\D/', '', $end);
        $startRow = 9;
        $this->clearRange($sheet, 'B', $startRow, 'N', $dataEndRow);

        foreach ($rows->values() as $offset => $record) {
            $targetRow = $startRow + $offset;
            if ($targetRow > $dataEndRow) {
                $sheet->insertNewRowBefore($dataEndRow + 1, 1);
                $sheet->duplicateStyle($sheet->getStyle("B{$dataEndRow}:N{$dataEndRow}"), "B{$targetRow}:N{$targetRow}");
                $dataEndRow = $targetRow;
                $table->setRange(preg_replace('/\d+$/', (string) $dataEndRow, $table->getRange()));
            }

            $values = collect(self::REGISTER_COLUMNS)->map(fn (string $column) => $record[$column] ?? null)->all();
            $this->writeRow($sheet, $targetRow, 'B', $values, [10]);
        }
    }

    private function clearRange(Worksheet $sheet, string $startColumn, int $startRow, string $endColumn, int $endRow): void
    {
        $start = Coordinate::columnIndexFromString($startColumn);
        $end = Coordinate::columnIndexFromString($endColumn);
        for ($row = $startRow; $row <= $endRow; $row++) {
            for ($column = $start; $column <= $end; $column++) {
                $sheet->getCell([$column, $row])->setValue(null);
            }
        }
    }

    /** @param array<int,mixed> $values @param array<int|string> $dateColumns */
    private function writeRow(Worksheet $sheet, int $row, string $startColumn, array $values, array $dateColumns = []): void
    {
        $columnIndex = Coordinate::columnIndexFromString($startColumn);
        foreach (array_values($values) as $offset => $value) {
            $cell = $sheet->getCell([$columnIndex + $offset, $row]);
            if ($value === null || $value === '') {
                $cell->setValue(null);

                continue;
            }
            if (in_array($offset, $dateColumns, true)) {
                $cell->setValue(Date::PHPToExcel(new \DateTimeImmutable((string) $value)));
                $cell->getStyle()->getNumberFormat()->setFormatCode('dd-mmm-yyyy');

                continue;
            }
            if (is_int($value) || is_float($value) || (is_numeric($value) && $offset >= 5 && $offset <= 9)) {
                $cell->setValueExplicit((float) $value, DataType::TYPE_NUMERIC);

                continue;
            }
            $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        }
    }

    /** @return Collection<int,array{0:?string,1:?string,2:string,3:string,4:float}> */
    private function receiptRows(Request $request): Collection
    {
        $query = Receipt::query()
            ->where('organization_id', $request->user()->organization_id)
            ->whereHas('payment.account.clientFile.client', fn (Builder $client) => $client->where('organization_id', $request->user()->organization_id))
            ->with([
                'payment.account.clientFile.client:id,first_name,last_name',
                'payment.account.allocation.stand:id,stand_no',
            ]);

        $visibleBranches = $this->branchAccess->branchIds($request->user());
        if ($visibleBranches !== null) {
            $query->whereHas('payment', fn (Builder $payment) => $payment->whereIn('branch_id', $visibleBranches));
        }
        if ($request->integer('branch')) {
            $query->whereHas('payment', fn (Builder $payment) => $payment->where('branch_id', $request->integer('branch')));
        }

        return $query->oldest('issued_at')->oldest('id')->get()->map(function (Receipt $receipt) {
            $payment = $receipt->payment;
            $client = $payment?->account?->clientFile?->client;

            return [
                $receipt->issued_at?->toDateString(),
                $payment?->account?->allocation?->stand?->stand_no,
                trim(($client?->first_name ?? '').' '.($client?->last_name ?? '')),
                $receipt->receipt_no,
                (float) ($payment?->amount ?? 0),
            ];
        });
    }
}
