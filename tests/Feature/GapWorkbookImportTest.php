<?php

namespace Tests\Feature;

use App\Models\AccountCharge;
use App\Models\Branch;
use App\Models\Client;
use App\Models\Development;
use App\Models\DevelopmentPhase;
use App\Models\GapRegisterEntry;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\StandType;
use App\Models\User;
use App\Services\BranchAccessService;
use App\Services\ImportContextOptions;
use Database\Seeders\PhaseOneSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class GapWorkbookImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PhaseOneSeeder::class);
    }

    public function test_administrator_can_open_the_workbook_import_page(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->get('/administration/data-import')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('property-operations/import')
                ->has('branches')
                ->has('phases')
                ->has('standTypes')
                ->has('currencies')
                ->has('paymentMethods'));
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_hatcliffe_template_can_be_validated_imported_and_reimported_safely(bool $cash): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::whereKey($admin->home_branch_id)->firstOrFail();
        $development = Development::create([
            'organization_id' => $admin->organization_id,
            'code' => 'HATCLIFFE',
            'name' => 'Hatcliffe',
            'location' => 'Harare',
            'status' => 'active',
        ]);
        $phase = DevelopmentPhase::create([
            'development_id' => $development->id,
            'code' => 'LEGACY',
            'name' => 'Legacy register',
            'survey_status' => 'approved',
        ]);
        $standType = StandType::where('organization_id', $admin->organization_id)->firstOrFail();
        $method = PaymentMethod::where('active', true)->where('cash_equivalent', $cash)->firstOrFail();
        $path = $this->makeWorkbook();
        // Simulate Excel's saved numeric result alongside a balance formula.
        $zip = new \ZipArchive;
        $zip->open($path);
        $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $xml = preg_replace('/(<c[^>]*r="J9"[^>]*>).*?(<\/c>)/s', '$1<f>G9+H9-I9</f><v>8000</v>$2', $xml);
        $zip->addFromString('xl/worksheets/sheet1.xml', $xml);
        $zip->close();
        $payload = [
            'branch_id' => $branch->id,
            'phase_id' => $phase->id,
            'stand_type_id' => $standType->id,
            'currency_code' => 'USD',
            'payment_method_id' => $method->id,
        ];

        $validationResponse = $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->post('/administration/data-import', [
                ...$payload,
                'mode' => 'validate',
                'workbook' => $this->upload($path),
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors()
            ->assertSessionHas('import_result', fn (array $result) => $result['valid'] === true
                && $result['counts']['rows'] === 2
                && $result['counts']['payments'] === 1
                && $result['preview']['on_ground'][0]['stand_no'] === '101'
                && filled($result['preview_token']));

        $previewToken = $validationResponse->getSession()->get('import_result')['preview_token'];

        $this->assertDatabaseCount('clients', 0);

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->post('/administration/data-import', [
                'mode' => 'import',
                'preview_token' => $previewToken,
            ])
            ->assertRedirect()
            ->assertSessionHas('success', 'Workbook imported successfully.');

        $client = Client::where('organization_id', $admin->organization_id)->firstOrFail();
        $stand = Stand::where('phase_id', $phase->id)->where('stand_no', '101')->firstOrFail();
        $allocation = StandAllocation::where('stand_id', $stand->id)->firstOrFail();
        $charge = AccountCharge::whereHas('account', fn ($query) => $query->where('allocation_id', $allocation->id))->firstOrFail();

        $this->assertSame('allocated', $stand->physical_status);
        $this->assertSame('Tariro', $client->first_name);
        $this->assertSame('Dube', $client->last_name);
        $this->assertSame('10500.0000', $charge->amount);
        $this->assertSame('partially_paid', $charge->status);
        $this->assertDatabaseHas('payments', ['amount' => 2500, 'status' => 'approved', 'method_id' => $method->id, 'cash_session_id' => null]);
        $optionService = app(ImportContextOptions::class);
        $phaseOption = $optionService->forOrganization((int) $admin->organization_id)['phases']->firstWhere('value', (string) $phase->id);
        $this->assertTrue($optionService->eligible($phaseOption, (string) $branch->id));
        $this->assertFalse($optionService->eligible($phaseOption, '999999'));
        $this->assertDatabaseHas('receipts', ['receipt_no' => 'RCT-HAT-001']);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'gaps-workbook.imported']);
        $this->assertDatabaseHas('gap_register_entries', [
            'organization_id' => $admin->organization_id,
            'branch_id' => $branch->id,
            'client_id' => $client->id,
            'stand_id' => $stand->id,
            'stand_allocation_id' => $allocation->id,
            'register_type' => 'on_ground',
            'stand_no_snapshot' => '101',
            'cooperative' => 'Alpha Co-op',
            'interest_amount' => 500,
            'amount_paid' => 2500,
            'balance' => 8000,
            'register_comment' => 'Imported register',
            'captured_by' => 'Admin',
        ]);

        foreach (['clients', 'stand-allocations'] as $resource) {
            $this->actingAs($admin)
                ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
                ->get("/administration/{$resource}?register=on_ground")
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->component('administration/resource')
                    ->where('registerView', true)
                    ->where('filters.register', 'on_ground')
                    ->where('registerStats.on_ground', 1)
                    ->where('resource.columns.0.label', 'Stand No.')
                    ->where('resource.columns.12.label', 'By')
                    ->where('records.total', 1)
                    ->where('records.data.0.stand_no', '101')
                    ->where('records.data.0.cooperative', 'Alpha Co-op')
                    ->where('records.data.0.interest_amount', '500.0000')
                    ->where('records.data.0.register_comment', 'Imported register')
                    ->where('records.data.0.captured_by', 'Admin')
                    ->where('records.data.0.client_action.resource', 'clients')
                    ->where('records.data.0.client_action.record.id', $client->id)
                    ->where('records.data.0.allocation_action.resource', 'stand-allocations')
                    ->where('records.data.0.allocation_action.record.id', $allocation->id));
        }

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->get('/administration/stand-allocations?register=on_ground&cooperative=Alpha&area_min=400&area_max=600&balance_min=7000&balance_max=9000&payment_state=with_payments&contact_state=with_contact&last_payment_from=2026-10-01&last_payment_to=2026-10-31')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.cooperative', 'Alpha')
                ->where('filters.area_min', '400')
                ->where('filters.payment_state', 'with_payments')
                ->where('filters.contact_state', 'with_contact')
                ->where('records.total', 1)
                ->where('records.data.0.stand_no', '101'));

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->get('/administration/stand-allocations?register=on_ground&area_min=600')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('records.total', 0));

        $exportResponse = $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->get('/administration/gaps-register/export')
            ->assertOk()
            ->assertDownload();
        $exported = IOFactory::load($exportResponse->baseResponse->getFile()->getPathname());
        $this->assertSame(
            ['RECIEPTS', 'ON GROUND', 'DOUBLE ALLOCATION', 'WAITING LIST', 'STATISTICS'],
            $exported->getSheetNames(),
        );
        $this->assertSame('STAND NO', $exported->getSheetByName('ON GROUND')->getCell('B8')->getValue());
        $this->assertSame('101', $exported->getSheetByName('ON GROUND')->getCell('B9')->getValue());
        $this->assertSame('Tariro', $exported->getSheetByName('ON GROUND')->getCell('C9')->getValue());
        $this->assertSame('RCT-HAT-001', $exported->getSheetByName('RECIEPTS')->getCell('D2')->getValue());
        $this->assertSame("=COUNTA('ON GROUND'!B9:B2000)", $exported->getSheetByName('STATISTICS')->getCell('C9')->getValue());
        $this->assertNotEmpty($exported->getSheetByName('ON GROUND')->getTableCollection());
        $exported->disconnectWorksheets();

        $secondValidationResponse = $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->post('/administration/data-import', [
                ...$payload,
                'mode' => 'validate',
                'workbook' => $this->upload($path),
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $secondPreviewToken = $secondValidationResponse->getSession()->get('import_result')['preview_token'];

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->post('/administration/data-import', [
                'mode' => 'import',
                'preview_token' => $secondPreviewToken,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('clients', 1);
        $this->assertDatabaseCount('stands', 1);
        $this->assertDatabaseCount('stand_allocations', 1);
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseCount('receipts', 1);
        $this->assertDatabaseCount('gap_register_entries', 1);
        $this->assertSame('on_ground', GapRegisterEntry::firstOrFail()->register_type);
        $this->assertSame('2500.0000', Payment::firstOrFail()->amount);
        $this->assertSame('RCT-HAT-001', Receipt::firstOrFail()->receipt_no);
    }

    public function test_workbook_cannot_be_imported_without_a_validated_preview(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->withSession([BranchAccessService::SESSION_KEY => $admin->home_branch_id])
            ->post('/administration/data-import', [
                'mode' => 'import',
                'preview_token' => fake()->uuid(),
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('preview_token');
    }

    public function test_all_three_gaps_registers_are_available_as_directory_tabs(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $branch = Branch::whereKey($admin->home_branch_id)->firstOrFail();
        $development = Development::create([
            'organization_id' => $admin->organization_id,
            'code' => 'REGISTER-TABS',
            'name' => 'Register tabs estate',
            'location' => 'Harare',
            'status' => 'active',
        ]);
        $phase = DevelopmentPhase::create([
            'development_id' => $development->id,
            'code' => 'LEGACY',
            'name' => 'Legacy register',
            'survey_status' => 'approved',
        ]);
        $payload = [
            'branch_id' => $branch->id,
            'phase_id' => $phase->id,
            'stand_type_id' => StandType::where('organization_id', $admin->organization_id)->firstOrFail()->id,
            'currency_code' => 'USD',
            'payment_method_id' => PaymentMethod::where('active', true)->firstOrFail()->id,
        ];
        $path = $this->makeRegisterWorkbook();

        $validated = $this->actingAs($admin)->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->post('/administration/data-import', [...$payload, 'mode' => 'validate', 'workbook' => $this->upload($path)])
            ->assertSessionHasNoErrors();

        $this->actingAs($admin)->withSession([BranchAccessService::SESSION_KEY => $branch->id])
            ->post('/administration/data-import', [
                'mode' => 'import',
                'preview_token' => $validated->getSession()->get('import_result')['preview_token'],
            ])->assertSessionHasNoErrors();

        $this->assertDatabaseCount('gap_register_entries', 3);
        foreach (['on_ground', 'double_allocation', 'waiting_list'] as $register) {
            $this->assertDatabaseHas('gap_register_entries', ['register_type' => $register]);
        }

        foreach (['clients', 'stand-allocations'] as $resource) {
            $this->actingAs($admin)
                ->get("/administration/{$resource}?register=waiting_list")
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->where('registerStats.on_ground', 1)
                    ->where('registerStats.double_allocation', 1)
                    ->where('registerStats.waiting_list', 1)
                    ->where('records.total', 1)
                    ->where('records.data.0.first_name', 'Rudo')
                    ->where('records.data.0.cooperative', 'Hatcliffe Co-op')
                    ->where('records.data.0.register_comment', 'Awaiting allocation')
                    ->where('records.data.0.client_action.resource', 'clients')
                    ->where('records.data.0.allocation_action', null));
        }
    }

    private function makeWorkbook(): string
    {
        $path = storage_path('framework/testing/gaps-import-'.uniqid().'.xlsx');
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0777, true);
        }

        $writer = new Writer;
        $writer->openToFile($path);
        $writer->getCurrentSheet()->setName('ON GROUND');
        for ($row = 1; $row < 8; $row++) {
            $writer->addRow(Row::fromValues(['']));
        }
        $writer->addRow(Row::fromValues([
            'STAND NO', 'FIRST NAME', 'SURNAME', 'CO-OPERATIVE ', 'CONTACTS', 'STAND SIZE', 'STAND PRICE',
            'INTEREST ', 'AMOUNT PAID', 'BALANCE', 'LAST PAYMENT DATE', 'COMMENT', 'BY',
        ]));
        $writer->addRow(Row::fromValues([
            '101', 'Tariro', 'Dube', 'Alpha Co-op', '+263 77 123 4567', 500, 10000,
            500, 2500, 8000, '2026-10-10', 'Imported register', 'Admin',
        ]));

        $writer->addNewSheetAndMakeItCurrent()->setName('RECIEPTS');
        $writer->addRow(Row::fromValues(['DATE', 'STAND NUMBER', 'NAME', 'RECIEPT NUMBERS', 'AMOUNT']));
        $writer->addRow(Row::fromValues(['2026-10-10', '101', 'Tariro Dube', 'RCT-HAT-001', 2500]));

        $writer->addNewSheetAndMakeItCurrent()->setName('STATISTICS');
        $writer->addRow(Row::fromValues(['HATCLIFFE STATISTICS SUMMARY']));
        $writer->close();

        return $path;
    }

    private function makeRegisterWorkbook(): string
    {
        $path = storage_path('framework/testing/gaps-registers-'.uniqid().'.xlsx');
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0777, true);
        }

        $headers = [
            'STAND NO', 'FIRST NAME', 'SURNAME', 'CO-OPERATIVE ', 'CONTACTS', 'STAND SIZE', 'STAND PRICE',
            'INTEREST ', 'AMOUNT PAID', 'BALANCE', 'LAST PAYMENT DATE', 'COMMENT', 'BY',
        ];
        $writer = new Writer;
        $writer->openToFile($path);
        $writer->getCurrentSheet()->setName('ON GROUND');
        $writer->addRow(Row::fromValues($headers));
        $writer->addRow(Row::fromValues(['501', 'Tariro', 'Dube', 'Hatcliffe Co-op', '+263771111111', 450, 12_000, 500, 0, 12_500, null, 'Primary allocation', 'Admin']));

        $writer->addNewSheetAndMakeItCurrent()->setName('DOUBLE ALLOCATION');
        $writer->addRow(Row::fromValues($headers));
        $writer->addRow(Row::fromValues(['501', 'Farai', 'Chikore', 'Hatcliffe Co-op', '+263772222222', 450, 12_000, 500, 0, 12_500, null, 'Disputed stand', 'Supervisor']));

        $writer->addNewSheetAndMakeItCurrent()->setName('WAITING LIST');
        $writer->addRow(Row::fromValues($headers));
        $writer->addRow(Row::fromValues([null, 'Rudo', 'Moyo', 'Hatcliffe Co-op', '+263773333333', null, null, null, null, null, null, 'Awaiting allocation', 'Agent']));
        $writer->close();

        return $path;
    }

    private function upload(string $path): UploadedFile
    {
        return new UploadedFile(
            $path,
            'GAPS INDEX - HATCLIFFE - UPDATED - TEMPLETE.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true,
        );
    }
}
