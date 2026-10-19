<?php

namespace App\Services;

use App\Models\Stand;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use OpenSpout\Common\Entity\Cell\FormulaCell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Reader\XLSX\Reader;
use OpenSpout\Writer\XLSX\Writer;
use Throwable;

class StandBulkWorkbook
{
    public const MAX_ROWS = 500;

    /**
     * @return array{rows:array<int,array<string,mixed>>,issues:array<int,string>,filename:string}
     */
    public function parse(UploadedFile $file): array
    {
        $reader = new Reader;
        $rows = [];
        $issues = [];
        $recognized = false;

        try {
            $reader->open($file->getRealPath());

            foreach ($reader->getSheetIterator() as $sheet) {
                $headers = null;
                $rowNumber = 0;

                foreach ($sheet->getRowIterator() as $row) {
                    $rowNumber++;
                    $values = array_map(
                        fn ($cell) => $cell instanceof FormulaCell
                            ? ($cell->getComputedValue() ?? $cell->getValue())
                            : $cell->getValue(),
                        $row->getCells(),
                    );

                    if ($headers === null) {
                        $candidate = $this->headerMap($values);
                        if (isset($candidate['stand_no'], $candidate['area_sqm'])) {
                            $headers = $candidate;
                            $recognized = true;
                        }

                        continue;
                    }

                    $data = $this->mapRow($headers, $values);
                    if ($this->emptyRow($data)) {
                        continue;
                    }

                    if (count($rows) >= self::MAX_ROWS) {
                        $issues[] = 'The workbook contains more than '.self::MAX_ROWS.' stand rows. Split it into smaller files.';

                        break 2;
                    }

                    $rows[] = [
                        'source_row' => $rowNumber,
                        'stand_no' => $data['stand_no'] ?? null,
                        'area_sqm' => $data['area_sqm'] ?? null,
                        'list_price' => $data['list_price'] ?? null,
                        'survey_reference' => $data['survey_reference'] ?? null,
                    ];
                }

                if ($headers !== null) {
                    break;
                }
            }
        } catch (Throwable $exception) {
            $issues[] = 'The XLSX workbook could not be read: '.$exception->getMessage();
        } finally {
            $reader->close();
        }

        if (! $recognized) {
            $issues[] = 'No sheet contained both Stand Number and Area (m²) headings. Download and use the stand import template.';
        }

        return [
            'rows' => $rows,
            'issues' => array_values(array_unique($issues)),
            'filename' => $file->getClientOriginalName(),
        ];
    }

    /**
     * @param  array<int,array<string,mixed>>  $rows
     * @param  array{phase_id:int,stand_type_id:int,currency_code:string,physical_status:string,shared_list_price:float|null}  $context
     * @param  array<int,string>  $parserIssues
     * @return array<string,mixed>
     */
    public function preview(array $rows, array $context, array $parserIssues = [], ?string $filename = null): array
    {
        $issues = $parserIssues;
        if ($rows === []) {
            $issues[] = 'Add at least one stand before validating the import.';
        }
        if (count($rows) > self::MAX_ROWS) {
            $issues[] = 'A maximum of '.self::MAX_ROWS.' stands can be imported at once.';
            $rows = array_slice($rows, 0, self::MAX_ROWS);
        }

        $existing = Stand::query()
            ->where('phase_id', $context['phase_id'])
            ->pluck('stand_no')
            ->mapWithKeys(fn (string $number) => [Str::lower(trim($number)) => true])
            ->all();
        $seen = [];
        $duplicateCount = 0;
        $existingCount = 0;

        $previewRows = collect(array_values($rows))->map(function (array $row, int $index) use ($context, $existing, &$seen, &$duplicateCount, &$existingCount) {
            $errors = [];
            $standNo = trim((string) ($row['stand_no'] ?? ''));
            $area = $this->number($row['area_sqm'] ?? null);
            $rowPrice = $this->number($row['list_price'] ?? null);
            $effectivePrice = $rowPrice ?? $context['shared_list_price'];
            $surveyReference = trim((string) ($row['survey_reference'] ?? ''));
            $key = Str::lower($standNo);
            $duplicate = false;
            $alreadyExists = false;

            if ($standNo === '') {
                $errors[] = 'Stand number is required.';
            } elseif (mb_strlen($standNo) > 60) {
                $errors[] = 'Stand number cannot exceed 60 characters.';
            } else {
                if (isset($seen[$key])) {
                    $duplicate = true;
                    $duplicateCount++;
                    $errors[] = "Duplicate stand number; first entered on row {$seen[$key]}.";
                } else {
                    $seen[$key] = (int) ($row['source_row'] ?? $index + 1);
                }

                if (isset($existing[$key])) {
                    $alreadyExists = true;
                    $existingCount++;
                    $errors[] = 'This stand number already exists in the selected development phase.';
                }
            }

            if ($area === null || $area <= 0) {
                $errors[] = 'Area must be a number greater than zero.';
            }
            if (filled($row['list_price'] ?? null) && ($rowPrice === null || $rowPrice < 0)) {
                $errors[] = 'List price must be zero or greater.';
            }
            if ($effectivePrice === null && $context['physical_status'] !== 'planned') {
                $errors[] = 'List price is required unless the stands are being captured as planned.';
            }
            if (mb_strlen($surveyReference) > 255) {
                $errors[] = 'Survey reference cannot exceed 255 characters.';
            }

            return [
                'source_row' => (int) ($row['source_row'] ?? $index + 1),
                'stand_no' => $standNo,
                'area_sqm' => $area,
                'list_price' => $rowPrice,
                'effective_list_price' => $effectivePrice ?? 0.0,
                'survey_reference' => $surveyReference,
                'duplicate' => $duplicate,
                'existing' => $alreadyExists,
                'valid' => $errors === [],
                'errors' => $errors,
            ];
        })->all();

        $invalidCount = collect($previewRows)->where('valid', false)->count();
        $valid = $issues === [] && $invalidCount === 0 && $previewRows !== [];

        return [
            'valid' => $valid,
            'filename' => $filename,
            'issues' => array_values(array_unique($issues)),
            'summary' => [
                'total' => count($previewRows),
                'valid' => count($previewRows) - $invalidCount,
                'invalid' => $invalidCount,
                'duplicates' => $duplicateCount,
                'existing' => $existingCount,
            ],
            'rows' => $previewRows,
        ];
    }

    public function template(): string
    {
        $path = tempnam(sys_get_temp_dir(), 'stand-import-template-');
        if ($path === false) {
            throw new \RuntimeException('Unable to create the stand import template.');
        }

        $writer = new Writer;
        $writer->openToFile($path);
        $header = (new Style)->setFontBold()->setFontColor('FFFFFF')->setBackgroundColor('00865A');

        try {
            $sheet = $writer->getCurrentSheet()->setName('Stands');
            foreach ([24, 20, 20, 30] as $index => $width) {
                $sheet->setColumnWidth($width, $index + 1);
            }
            $writer->addRow(Row::fromValues(['Stand Number', 'Area (m²)', 'List Price', 'Survey Reference'], $header));

            $instructions = $writer->addNewSheetAndMakeItCurrent()->setName('Instructions');
            $instructions->setColumnWidth(24, 1);
            $instructions->setColumnWidth(76, 2);
            $writer->addRow(Row::fromValues(['Column', 'Requirement'], $header));
            $writer->addRow(Row::fromValues(['Stand Number', 'Required. Must be unique within the selected development phase.']));
            $writer->addRow(Row::fromValues(['Area (m²)', 'Required. Enter the stand size as a number greater than zero.']));
            $writer->addRow(Row::fromValues(['List Price', 'Optional when the shared price is used or the initial status is Planned.']));
            $writer->addRow(Row::fromValues(['Survey Reference', 'Optional cadastral or survey reference.']));
            $writer->addRow(Row::fromValues(['Import limit', 'Up to '.self::MAX_ROWS.' stands per workbook.']));
        } finally {
            $writer->close();
        }

        return $path;
    }

    /** @return array<string,int> */
    private function headerMap(array $values): array
    {
        $headers = [];
        foreach ($values as $index => $value) {
            $normalized = $this->normalizeHeader($value);
            if ($normalized !== null) {
                $headers[$normalized] = $index;
            }
        }

        return $headers;
    }

    private function normalizeHeader(mixed $value): ?string
    {
        $header = Str::lower(trim((string) $value));
        $header = str_replace(['²', '^2'], '2', $header);
        $header = trim((string) preg_replace('/[^a-z0-9]+/', '_', $header), '_');

        return match ($header) {
            'stand', 'stand_no', 'stand_number', 'stand_num', 'stand_id' => 'stand_no',
            'area', 'area_m', 'area_m2', 'area_sqm', 'sqm', 'square_metres', 'square_meters', 'stand_size' => 'area_sqm',
            'price', 'list_price', 'stand_price' => 'list_price',
            'survey', 'survey_ref', 'survey_reference' => 'survey_reference',
            default => null,
        };
    }

    /** @return array<string,mixed> */
    private function mapRow(array $headers, array $values): array
    {
        $row = [];
        foreach ($headers as $header => $index) {
            $row[$header] = $values[$index] ?? null;
        }

        return $row;
    }

    private function emptyRow(array $row): bool
    {
        return collect(['stand_no', 'area_sqm', 'list_price', 'survey_reference'])
            ->every(fn (string $key) => blank($row[$key] ?? null));
    }

    private function number(mixed $value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $normalized = str_replace([',', ' '], '', trim((string) $value));

        return is_numeric($normalized) ? (float) $normalized : null;
    }
}
