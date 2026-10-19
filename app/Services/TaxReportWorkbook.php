<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class TaxReportWorkbook
{
    public function create(array $data): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('VAT Report');
        $sheet->fromArray([
            ['VAT / Tax control report'],
            [$data['organization']],
            ['Period', $data['from'].' to '.$data['to']],
            [],
            ['Taxable sales', $data['report']['summary']['taxable_sales'], 'Output tax', $data['report']['summary']['output_tax']],
            ['Taxable purchases', $data['report']['summary']['taxable_purchases'], 'Input tax', $data['report']['summary']['input_tax']],
            ['Net tax payable / (refundable)', $data['report']['summary']['net_tax']],
            [],
            ['Date', 'Source', 'Document', 'Counterparty', 'Branch', 'Tax code', 'Description', 'Taxable amount', 'Input tax', 'Output tax'],
        ]);
        $row = 10;
        foreach ($data['report']['rows'] as $transaction) {
            $sheet->fromArray([[
                $transaction['date'], $transaction['source'], $transaction['document_no'], $transaction['counterparty'], $transaction['branch'],
                $transaction['tax_code'], $transaction['description'], $transaction['taxable_amount'], $transaction['input_tax'], $transaction['output_tax'],
            ]], null, "A{$row}");
            $row++;
        }
        $sheet->getStyle('A1:J1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0F172A');
        $sheet->getStyle('A1:J1')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A9:J9')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E2E8F0');
        $sheet->getStyle('A9:J9')->getFont()->setBold(true);
        $sheet->getStyle("H5:J{$row}")->getNumberFormat()->setFormatCode('#,##0.00;[Red]-#,##0.00');
        foreach (range('A', 'J') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        $temporary = tempnam(sys_get_temp_dir(), 'vat-report-');
        $path = $temporary.'.xlsx';
        @unlink($temporary);
        (new Xlsx($spreadsheet))->save($path);

        return $path;
    }
}
