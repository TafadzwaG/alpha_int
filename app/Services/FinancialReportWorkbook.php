<?php

namespace App\Services;

use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Properties;
use OpenSpout\Writer\XLSX\Writer;

class FinancialReportWorkbook
{
    public function create(array $data): string
    {
        $path = tempnam(sys_get_temp_dir(), 'financial-report-');
        if ($path === false) {
            throw new \RuntimeException('Unable to create the financial report file.');
        }
        $target = $path.'.xlsx';
        rename($path, $target);
        $writer = new Writer;
        $writer->getOptions()->setProperties(new Properties(title: $data['title'], subject: 'General ledger financial report', creator: 'Alpha Land ERP'));
        $writer->openToFile($target);
        $sheet = $writer->getCurrentSheet()->setName(mb_substr($data['title'], 0, 31));
        foreach ([1 => 16, 2 => 22, 3 => 32, 4 => 18, 5 => 18, 6 => 18] as $column => $width) {
            $sheet->setColumnWidth($width, $column);
        }
        $writer->addRow(Row::fromValues([mb_strtoupper($data['title'])], $this->titleStyle()));
        $writer->addRow(Row::fromValues(['Period', $data['from'].' to '.$data['to']]));
        $writer->addRow(Row::fromValues(['Generated', now()->format('d M Y H:i')]));
        $writer->addRow(Row::fromValues([]));
        if ($data['report']['type'] === 'general-ledger') {
            $writer->addRow(Row::fromValues(['Date', 'Journal', 'Account', 'Description', 'Debit', 'Credit'], $this->headerStyle()));
            foreach ($data['report']['rows'] as $row) {
                $writer->addRow(Row::fromValues([$row->entry_date, $row->journal_no, $row->code.' · '.$row->name, $row->description ?: $row->journal_description, (float) $row->debit, (float) $row->credit]));
            }
        } else {
            $headings = match ($data['report']['type']) {
                'budget-variance' => ['Budget', 'Actual', 'Variance'],
                'comparative-income' => ['Current', 'Prior', 'Movement'],
                'monthly-performance' => ['Revenue', 'Expenses', 'Profit'],
                'cash-flow' => ['Cash in', 'Cash out', 'Net movement'],
                'control-reconciliation' => ['GL balance', 'Subledger', 'Difference'],
                default => ['Debit', 'Credit', 'Balance'],
            };
            $writer->addRow(Row::fromValues(['Code', 'Account', 'Class', ...$headings], $this->headerStyle()));
            foreach ($data['report']['rows'] as $row) {
                $writer->addRow(Row::fromValues([$row['code'], $row['name'], $row['type'], $row['debit'], $row['credit'], $row['balance']]));
            }
        }
        $writer->close();

        return $target;
    }

    private function titleStyle(): Style
    {
        return (new Style)->setFontBold()->setFontSize(15)->setFontColor(Color::rgb(22, 101, 52));
    }

    private function headerStyle(): Style
    {
        return (new Style)->setFontBold()->setFontColor(Color::WHITE)->setBackgroundColor(Color::rgb(15, 23, 42));
    }
}
