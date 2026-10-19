<?php

namespace Tests\Feature;

use App\Models\StandLegalCase;
use App\Models\StandLegalCaseFile;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StandLegalCaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_seeded_legal_flag_appears_on_stand_detail_directory_and_map(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $legalCase = StandLegalCase::where('case_number', 'LC-DEMO-001')->firstOrFail();

        $this->actingAs($admin)->get("/administration/stands/{$legalCase->stand_id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('property-operations/stand-show')
                ->where('stand.legal_flagged', true)
                ->where('stand.active_legal_cases_count', 1)
                ->has('legalCases', 1)
                ->where('legalCases.0.case_number', 'LC-DEMO-001')
                ->has('legalCases.0.notes', 2)
                ->has('legalCases.0.files', 1));

        $this->actingAs($admin)->get('/administration/stands?search=101')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('records.data.0.legal_flag.active', true)
                ->where('records.data.0.legal_flag.count', 1));

        $this->actingAs($admin)->get('/administration/stands/map?hide_allocated=0&search=101')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stands.0.legalFlagged', true)
                ->where('stands.0.legalCasesCount', 1)
                ->where('stands.0.legalPriority', 'high'));
    }

    public function test_administrator_can_add_notes_upload_download_and_resolve_a_legal_case(): void
    {
        $admin = User::where('email', 'test@example.com')->firstOrFail();
        $legalCase = StandLegalCase::where('case_number', 'LC-DEMO-001')->firstOrFail();

        $this->actingAs($admin)
            ->post("/administration/stands/{$legalCase->stand_id}/legal-cases/{$legalCase->id}/notes", ['body' => 'Court order received and indexed.'])
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('stand_legal_case_notes', ['stand_legal_case_id' => $legalCase->id, 'body' => 'Court order received and indexed.']);

        $this->actingAs($admin)
            ->post("/administration/stands/{$legalCase->stand_id}/legal-cases/{$legalCase->id}/files", [
                'documents' => [UploadedFile::fake()->create('court-order.pdf', 120, 'application/pdf')],
            ])
            ->assertSessionHasNoErrors();
        $file = StandLegalCaseFile::where('original_name', 'court-order.pdf')->firstOrFail();
        Storage::disk('local')->assertExists($file->path);
        $this->actingAs($admin)
            ->get("/administration/stands/{$legalCase->stand_id}/legal-cases/{$legalCase->id}/files/{$file->id}")
            ->assertOk()
            ->assertDownload('court-order.pdf');

        $this->actingAs($admin)
            ->patch("/administration/stands/{$legalCase->stand_id}/legal-cases/{$legalCase->id}", [
                'status' => 'resolved',
                'priority' => 'high',
                'next_hearing_on' => null,
                'assigned_to' => $admin->id,
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($admin)->get("/administration/stands/{$legalCase->stand_id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stand.legal_flagged', false)
                ->where('stand.active_legal_cases_count', 0)
                ->where('legalCases.0.status', 'resolved'));
    }
}
