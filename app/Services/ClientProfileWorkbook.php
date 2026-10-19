<?php

namespace App\Services;

use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;

class ClientProfileWorkbook
{
    public function create(array $profile): string
    {
        $path = tempnam(sys_get_temp_dir(), 'client-profile-');
        if ($path === false) {
            throw new \RuntimeException('Unable to create profile export.');
        }
        $writer = new Writer;
        $writer->openToFile($path);
        $header = (new Style)->setFontBold()->setFontColor('FFFFFF')->setBackgroundColor('123D6A');
        try {
            $writer->getCurrentSheet()->setName('Profile');
            $writer->getCurrentSheet()->setColumnWidth(28, 1);
            $writer->getCurrentSheet()->setColumnWidth(48, 2);
            $writer->addRow(Row::fromValues(['CLIENT PROFILE', $profile['client']['name']], $header));
            $writer->addRow(Row::fromValues(['Generated', now()->format('Y-m-d H:i')]));
            foreach (['client_no' => 'Client number', 'name' => 'Name', 'branch' => 'Owning branch', 'phone' => 'Phone', 'status' => 'Status'] as $key => $label) {
                $writer->addRow(Row::fromValues([$label, $profile['client'][$key]]));
            }
            foreach ($profile['summary'] as $key => $value) {
                $writer->addRow(Row::fromValues([str($key)->headline()->toString(), $value]));
            }
            foreach ([
                'Client files' => [['file_no', 'branch', 'opened_at', 'status'], $profile['client']['files']],
                'Purchases' => [['stand_no', 'development', 'branch', 'currency', 'price', 'paid', 'balance', 'next_due_date'], $profile['allocations']],
                'Call history' => [['occurred_at', 'agent', 'branch', 'direction', 'duration_seconds', 'outcome', 'summary'], $profile['callHistory']],
            ] as $name => [$keys, $rows]) {
                $sheet = $writer->addNewSheetAndMakeItCurrent()->setName($name);
                foreach ($keys as $index => $key) {
                    $sheet->setColumnWidth($key === 'summary' ? 70 : 26, $index + 1);
                }
                $writer->addRow(Row::fromValues(array_map(fn ($key) => str($key)->headline()->toString(), $keys), $header));
                foreach ($rows as $row) {
                    $writer->addRow(Row::fromValues(array_map(fn ($key) => $row[$key] ?? '', $keys)));
                }
            }
        } finally {
            $writer->close();
        }

        return $path;
    }
}
