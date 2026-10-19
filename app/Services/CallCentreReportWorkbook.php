<?php

namespace App\Services;

use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Properties;
use OpenSpout\Writer\XLSX\Writer;

class CallCentreReportWorkbook
{
    public function create(array $report): string
    {
        $path = tempnam(sys_get_temp_dir(), 'call-centre-report-');
        if ($path === false) {
            throw new \RuntimeException('Unable to create a temporary report file.');
        }
        $xlsxPath = $path.'.xlsx';
        rename($path, $xlsxPath);
        $writer = new Writer;
        $writer->getOptions()->setProperties(new Properties(title: 'Alpha Land Call Centre Report', subject: 'Call centre performance', creator: $report['organization']['name']));
        $writer->openToFile($xlsxPath);

        try {
            $writer->addRow(Row::fromValues(['ALPHA LAND CALL CENTRE REPORT'], $this->titleStyle()));
            $writer->addRow(Row::fromValues(['Period', $report['period']['from'].' to '.$report['period']['to']]));
            $writer->addRow(Row::fromValues([]));
            $writer->addRow(Row::fromValues(['Metric', 'Value'], $this->headerStyle()));
            foreach ($report['summary'] as $metric => $value) {
                $writer->addRow(Row::fromValues([str($metric)->headline()->toString(), $value]));
            }

            $sheet = $writer->addNewSheetAndMakeItCurrent()->setName('Agent Performance');
            foreach ([1 => 28, 2 => 18, 3 => 18, 4 => 20, 5 => 20] as $column => $width) {
                $sheet->setColumnWidth($width, $column);
            }
            $writer->addRow(Row::fromValues(['Agent', 'Interactions', 'Contacts', 'Contact rate %', 'Completed tasks'], $this->headerStyle()));
            foreach ($report['agentPerformance'] as $row) {
                $writer->addRow(Row::fromValues([$row['agent'], $row['interactions'], $row['contacts'], $row['contactRate'], $row['completedTasks']]));
            }

            $writer->addNewSheetAndMakeItCurrent()->setName('Branch Performance');
            $writer->addRow(Row::fromValues(['Branch', 'Calls', 'Contacts', 'Open tasks', 'Promises', 'Collections'], $this->headerStyle()));
            foreach ($report['branchPerformance'] as $row) {
                $writer->addRow(Row::fromValues([$row['branch'], $row['calls'], $row['contacts'], $row['openTasks'], $row['promises'], $row['collections']]));
            }

            $writer->addNewSheetAndMakeItCurrent()->setName('Daily Activity');
            $writer->addRow(Row::fromValues(['Date', 'Calls', 'Contacts'], $this->headerStyle()));
            foreach ($report['daily'] as $row) {
                $writer->addRow(Row::fromValues([$row['date'], $row['calls'], $row['contacts']]));
            }
        } finally {
            $writer->close();
        }

        return $xlsxPath;
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
