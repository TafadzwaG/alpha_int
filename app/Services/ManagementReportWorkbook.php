<?php

namespace App\Services;

use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\Common\Entity\Sheet;
use OpenSpout\Writer\XLSX\Properties;
use OpenSpout\Writer\XLSX\Writer;

class ManagementReportWorkbook
{
    public function create(array $report): string
    {
        $path = tempnam(sys_get_temp_dir(), 'alpha-report-');

        if ($path === false) {
            throw new \RuntimeException('Unable to create a temporary report file.');
        }

        $xlsxPath = $path.'.xlsx';
        rename($path, $xlsxPath);

        $writer = new Writer;
        $writer->getOptions()->setProperties(new Properties(
            title: 'Alpha Land Management Report',
            subject: 'Financial and operational management report',
            creator: $report['organization']['name'],
            lastModifiedBy: $report['organization']['name'],
            description: 'Management report generated from the Alpha Land ERP.',
        ));
        $writer->openToFile($xlsxPath);

        try {
            $this->writeSummary($writer, $report);
            $this->writeMonthly($writer, $report);
            $this->writeAging($writer, $report);
            $this->writeDevelopments($writer, $report);
            $this->writeExpenses($writer, $report);
            $this->writeBranches($writer, $report);
            $this->writePaymentChannels($writer, $report);
        } finally {
            $writer->close();
        }

        return $xlsxPath;
    }

    private function writeSummary(Writer $writer, array $report): void
    {
        $sheet = $writer->getCurrentSheet()->setName('Executive Summary');
        $sheet->setColumnWidth(28, 1);
        $sheet->setColumnWidth(22, 2);

        $writer->addRow(Row::fromValues(['ALPHA LAND MANAGEMENT REPORT'], $this->titleStyle()));
        $writer->addRow(Row::fromValues([$report['organization']['name']]));
        $writer->addRow(Row::fromValues(['Generated', now()->parse($report['generatedAt'])->format('d M Y H:i')]));
        $writer->addRow(Row::fromValues([]));
        $writer->addRow(Row::fromValues(['Metric', 'Value'], $this->headerStyle()));

        $summary = $report['summary'];
        foreach ([
            ['Billed - last 12 months', $summary['billed']],
            ['Collected - last 12 months', $summary['collected']],
            ['Outstanding receivables', $summary['outstanding']],
            ['Approved and paid expenses', $summary['expenses']],
            ['Net cash movement', $summary['collected'] - $summary['expenses']],
            ['Collection rate (%)', $summary['collectionRate']],
        ] as $row) {
            $writer->addRow(Row::fromValues($row));
        }
    }

    private function writeMonthly(Writer $writer, array $report): void
    {
        $this->newSheet($writer, 'Monthly Performance', [24, 18, 18, 18]);
        $writer->addRow(Row::fromValues(['Month', 'Billed', 'Collected', 'Expenses'], $this->headerStyle()));

        foreach ($report['monthly'] as $row) {
            $writer->addRow(Row::fromValues([$row['label'], $row['billed'], $row['collected'], $row['expenses']]));
        }
    }

    private function writeAging(Writer $writer, array $report): void
    {
        $this->newSheet($writer, 'Receivables Aging', [24, 20]);
        $writer->addRow(Row::fromValues(['Aging bucket', 'Outstanding'], $this->headerStyle()));

        foreach ($report['receivablesAging'] as $row) {
            $writer->addRow(Row::fromValues([$row['bucket'], $row['total']]));
        }
    }

    private function writeDevelopments(Writer $writer, array $report): void
    {
        $this->newSheet($writer, 'Developments', [28, 24, 16, 16, 20, 20]);
        $writer->addRow(Row::fromValues(['Development', 'Location', 'Total stands', 'Allocated stands', 'Inventory value', 'Allocated value'], $this->headerStyle()));

        foreach ($report['developmentPerformance'] as $row) {
            $writer->addRow(Row::fromValues([$row['development'], $row['location'], $row['total_stands'], $row['allocated_stands'], $row['inventory_value'], $row['allocated_value']]));
        }
    }

    private function writeExpenses(Writer $writer, array $report): void
    {
        $this->newSheet($writer, 'Expenses', [28, 16, 20]);
        $writer->addRow(Row::fromValues(['Category', 'Records', 'Total'], $this->headerStyle()));

        foreach ($report['expenseByCategory'] as $row) {
            $writer->addRow(Row::fromValues([$row['category'], $row['expense_count'], $row['total']]));
        }
    }

    private function writeBranches(Writer $writer, array $report): void
    {
        $this->newSheet($writer, 'Branch Cash Control', [26, 18, 18, 18, 22]);
        $writer->addRow(Row::fromValues(['Branch', 'Collected', 'Expenses', 'Banked', 'Unresolved variance'], $this->headerStyle()));

        foreach ($report['branchPerformance'] as $row) {
            $writer->addRow(Row::fromValues([$row['branch'], $row['collections'], $row['expenses'], $row['banked'], $row['unresolved_variance']]));
        }
    }

    private function writePaymentChannels(Writer $writer, array $report): void
    {
        $this->newSheet($writer, 'Payment Channels', [28, 18, 20]);
        $writer->addRow(Row::fromValues(['Payment method', 'Transactions', 'Collected'], $this->headerStyle()));

        foreach ($report['paymentMethods'] as $row) {
            $writer->addRow(Row::fromValues([$row['method'], $row['payment_count'], $row['total']]));
        }
    }

    private function newSheet(Writer $writer, string $name, array $widths): Sheet
    {
        $sheet = $writer->addNewSheetAndMakeItCurrent()->setName($name);

        foreach ($widths as $index => $width) {
            $sheet->setColumnWidth($width, $index + 1);
        }

        return $sheet;
    }

    private function titleStyle(): Style
    {
        return (new Style)->setFontBold()->setFontSize(16)->setFontColor(Color::WHITE)->setBackgroundColor('123D6A');
    }

    private function headerStyle(): Style
    {
        return (new Style)->setFontBold()->setFontColor(Color::WHITE)->setBackgroundColor('087E5B');
    }
}
