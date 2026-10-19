<?php

namespace App\Services;

use App\Models\BankReconciliation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class BankReconciliationWorkbook
{
    public function create(BankReconciliation $reconciliation, string $organization): string
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet();
        $sheet->setTitle('Bank reconciliation');
        $sheet->fromArray([
            ['Bank reconciliation report'], [$organization],
            ['Reference', $reconciliation->reference], ['Bank', $reconciliation->bankAccount?->bank_name.' · '.$reconciliation->bankAccount?->account_mask],
            ['Period', $reconciliation->from_date->toDateString().' to '.$reconciliation->to_date->toDateString()],
            ['Opening statement balance', (float) $reconciliation->opening_statement_balance],
            ['Closing statement balance', (float) $reconciliation->closing_statement_balance],
            ['Ledger closing balance', (float) $reconciliation->ledger_closing_balance],
            ['Difference', (float) $reconciliation->difference], ['Status', $reconciliation->status], [],
            ['Date', 'Reference', 'Description', 'Amount', 'Running balance', 'Status', 'Ledger journal', 'Resolution note'],
        ]);
        $row = 13;
        foreach ($reconciliation->items as $item) {
            $sheet->fromArray([[
                $item->statementLine?->transaction_date?->toDateString(), $item->statementLine?->reference, $item->statementLine?->description,
                (float) ($item->statementLine?->amount ?? 0), (float) ($item->statementLine?->balance ?? 0), $item->status,
                $item->journal?->journal_no, $item->resolution_note,
            ]], null, "A{$row}");
            $row++;
        }
        $sheet->getStyle('A1:H1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0F172A');
        $sheet->getStyle('A1:H1')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A12:H12')->getFont()->setBold(true);
        $sheet->getStyle("D6:E{$row}")->getNumberFormat()->setFormatCode('#,##0.00;[Red]-#,##0.00');
        foreach (range('A', 'H') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        $temporary = tempnam(sys_get_temp_dir(), 'bank-rec-');
        $path = $temporary.'.xlsx';
        @unlink($temporary);
        (new Xlsx($book))->save($path);

        return $path;
    }
}
