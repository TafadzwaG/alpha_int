<?php

namespace App\Services;

use Illuminate\Support\Collection;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;

class AllocationReportExport
{
    public function sections(array $report): array
    {
        $sections = [];
        foreach ([
            'Installments' => ['installments', ['sequence_no' => '#', 'due_date' => 'Due date', 'currency' => 'Currency', 'amount_due' => 'Amount due', 'amount_paid' => 'Paid', 'balance' => 'Balance', 'effective_status' => 'Status', 'reminder_count' => 'Reminders']],
            'Payments' => ['payments', ['received_at' => 'Received', 'method' => 'Method', 'reference' => 'Reference', 'installment_numbers' => 'Installments', 'receipt_no' => 'Receipt', 'currency' => 'Currency', 'amount' => 'Amount', 'status' => 'Status', 'notes' => 'Notes']],
            'Reminders' => ['reminders', ['installment_no' => 'Installment', 'channel' => 'Channel', 'remind_at' => 'Scheduled', 'status' => 'Status', 'sent_at' => 'Sent', 'created_by' => 'Created by', 'notes' => 'Notes']],
            'Timeline' => ['timeline', ['occurred_at' => 'Date', 'type' => 'Type', 'title' => 'Event', 'description' => 'Description']],
        ] as $title => [$key, $columns]) {
            $sections[$title] = ['headers' => array_values($columns), 'rows' => collect($report[$key])->map(fn ($row) => collect(array_keys($columns))->map(function ($key) use ($row) {
                $value = $row[$key] ?? null;

                return $value instanceof Collection ? $value->join(', ') : (is_array($value) ? implode(', ', $value) : $value);
            })->all())->all()];
        }

        return $sections;
    }

    public function excel(array $report): string
    {
        $path = tempnam(sys_get_temp_dir(), 'allocation-export-');
        if ($path === false) {
            throw new \RuntimeException('Unable to create export file.');
        }
        $writer = new Writer;
        $writer->openToFile($path);
        $header = (new Style)->setFontBold()->setFontColor('FFFFFF')->setBackgroundColor('123D6A');
        try {
            $sheet = $writer->getCurrentSheet()->setName('Allocation');
            $sheet->setColumnWidth(28, 1);
            $sheet->setColumnWidth(45, 2);
            $writer->addRow(Row::fromValues(['ALPHA LAND', 'ALLOCATION REPORT'], $header));
            $writer->addRow(Row::fromValues(['Generated', now()->format('Y-m-d H:i')]));
            foreach ($report['allocation'] as $key => $value) {
                if (str_ends_with($key, '_id') || $key === 'id') {
                    continue;
                }
                $writer->addRow(Row::fromValues([str($key)->headline()->toString(), $value]));
            }
            foreach ($report['sections'] as $title => $section) {
                $sheet = $writer->addNewSheetAndMakeItCurrent()->setName($title);
                foreach ($section['headers'] as $index => $label) {
                    $sheet->setColumnWidth(in_array($label, ['Notes', 'Description', 'Event']) ? 60 : 26, $index + 1);
                }
                $writer->addRow(Row::fromValues($section['headers'], $header));
                foreach ($section['rows'] as $row) {
                    $writer->addRow(Row::fromValues($row));
                }
            }
        } finally {
            $writer->close();
        }

        return $path;
    }
}
