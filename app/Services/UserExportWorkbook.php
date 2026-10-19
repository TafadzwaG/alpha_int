<?php

namespace App\Services;

use Illuminate\Support\Collection;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Properties;
use OpenSpout\Writer\XLSX\Writer;

class UserExportWorkbook
{
    public function create(string $organizationName, Collection $users): string
    {
        $path = tempnam(sys_get_temp_dir(), 'alpha-users-');

        if ($path === false) {
            throw new \RuntimeException('Unable to create a temporary user export file.');
        }

        $xlsxPath = $path.'.xlsx';
        rename($path, $xlsxPath);

        $writer = new Writer;
        $writer->getOptions()->setProperties(new Properties(
            title: 'Alpha Land User Directory',
            subject: 'User accounts, roles and branch access',
            creator: $organizationName,
            lastModifiedBy: $organizationName,
            description: 'User administration export generated from the Alpha Land ERP.',
        ));
        $writer->openToFile($xlsxPath);

        try {
            $sheet = $writer->getCurrentSheet()->setName('Users');
            foreach ([26, 34, 18, 18, 25, 35, 42, 22, 22] as $index => $width) {
                $sheet->setColumnWidth($width, $index + 1);
            }

            $writer->addRow(Row::fromValues(['ALPHA LAND USER DIRECTORY'], $this->titleStyle()));
            $writer->addRow(Row::fromValues([$organizationName]));
            $writer->addRow(Row::fromValues(['Generated', now()->format('d M Y H:i')]));
            $writer->addRow(Row::fromValues([]));
            $writer->addRow(Row::fromValues([
                'Name',
                'Email',
                'Status',
                'MFA policy',
                'Home branch',
                'Roles',
                'Branch access',
                'Last login',
                'Created',
            ], $this->headerStyle()));

            foreach ($users as $user) {
                $writer->addRow(Row::fromValues([
                    $user->name,
                    $user->email,
                    ucfirst($user->status),
                    ucfirst($user->mfa_state),
                    $user->homeBranch?->name ?? 'Not assigned',
                    $user->roles->pluck('name')->join(', '),
                    $user->branchAccess->where('active', true)->pluck('branch.name')->filter()->join(', '),
                    $user->last_login_at?->format('d M Y H:i') ?? 'Never',
                    $user->created_at?->format('d M Y H:i'),
                ]));
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
