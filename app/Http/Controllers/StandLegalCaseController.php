<?php

namespace App\Http\Controllers;

use App\Models\Stand;
use App\Models\StandLegalCase;
use App\Models\StandLegalCaseFile;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StandLegalCaseController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function store(Request $request, Stand $stand): RedirectResponse
    {
        $this->authorizeStand($request, $stand, true);
        $organizationId = (int) $request->user()->organization_id;
        $validated = $request->validate($this->caseRules($organizationId));

        $legalCase = DB::transaction(function () use ($validated, $organizationId, $request, $stand) {
            $legalCase = StandLegalCase::create([
                ...$validated,
                'organization_id' => $organizationId,
                'stand_id' => $stand->id,
                'created_by' => $request->user()->id,
            ]);
            $this->auditLogger->record($request, 'stand-legal-cases.created', $legalCase, null, $legalCase->toArray());

            return $legalCase;
        });

        return back()->with('success', "Legal case {$legalCase->case_number} created. Stand {$stand->stand_no} is now flagged.");
    }

    public function update(Request $request, Stand $stand, StandLegalCase $legalCase): RedirectResponse
    {
        $this->authorizeCase($request, $stand, $legalCase, true);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'pending', 'in_court', 'resolved', 'closed'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'next_hearing_on' => ['nullable', 'date'],
            'assigned_to' => [
                'nullable',
                Rule::exists('users', 'id')->where('organization_id', $request->user()->organization_id),
            ],
        ]);
        $before = $legalCase->toArray();
        $validated['resolved_at'] = in_array($validated['status'], ['resolved', 'closed'], true)
            ? ($legalCase->resolved_at ?? now())
            : null;
        $legalCase->update($validated);
        $this->auditLogger->record($request, 'stand-legal-cases.updated', $legalCase, $before, $legalCase->fresh()->toArray());

        return back()->with('success', "Legal case {$legalCase->case_number} updated.");
    }

    public function storeNote(Request $request, Stand $stand, StandLegalCase $legalCase): RedirectResponse
    {
        $this->authorizeCase($request, $stand, $legalCase, true);
        $validated = $request->validate(['body' => ['required', 'string', 'max:5000']]);
        $note = $legalCase->notes()->create([
            'body' => $validated['body'],
            'created_by' => $request->user()->id,
        ]);
        $this->auditLogger->record($request, 'stand-legal-case-notes.created', $note, null, $note->toArray());

        return back()->with('success', 'Legal case note added.');
    }

    public function storeFiles(Request $request, Stand $stand, StandLegalCase $legalCase): RedirectResponse
    {
        $this->authorizeCase($request, $stand, $legalCase, true);
        $validated = $request->validate([
            'documents' => ['required', 'array', 'min:1', 'max:10'],
            'documents.*' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,csv,jpg,jpeg,png,txt'],
        ]);

        foreach ($validated['documents'] as $document) {
            $extension = Str::lower($document->getClientOriginalExtension());
            $filename = Str::uuid().($extension ? ".{$extension}" : '');
            $path = $document->storeAs(
                "legal-cases/{$request->user()->organization_id}/{$stand->id}/{$legalCase->id}",
                $filename,
                'local',
            );
            abort_if($path === false, 500, 'The legal case document could not be stored.');
            $file = $legalCase->files()->create([
                'disk' => 'local',
                'path' => $path,
                'original_name' => $document->getClientOriginalName(),
                'mime_type' => $document->getMimeType(),
                'size_bytes' => $document->getSize(),
                'uploaded_by' => $request->user()->id,
            ]);
            $this->auditLogger->record($request, 'stand-legal-case-files.uploaded', $file, null, [
                'id' => $file->id,
                'original_name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
            ]);
        }

        return back()->with('success', count($validated['documents']).' legal case document(s) uploaded.');
    }

    public function download(Request $request, Stand $stand, StandLegalCase $legalCase, StandLegalCaseFile $file): StreamedResponse
    {
        $this->authorizeFile($request, $stand, $legalCase, $file);
        abort_unless(Storage::disk($file->disk)->exists($file->path), 404);

        return Storage::disk($file->disk)->download($file->path, $file->original_name, [
            'Content-Type' => $file->mime_type ?: 'application/octet-stream',
        ]);
    }

    public function destroyFile(Request $request, Stand $stand, StandLegalCase $legalCase, StandLegalCaseFile $file): RedirectResponse
    {
        $this->authorizeFile($request, $stand, $legalCase, $file, true);
        $before = $file->toArray();
        Storage::disk($file->disk)->delete($file->path);
        $file->delete();
        $this->auditLogger->record($request, 'stand-legal-case-files.deleted', $file, $before, null);

        return back()->with('success', 'Legal case document removed.');
    }

    private function caseRules(int $organizationId): array
    {
        return [
            'case_number' => ['required', 'string', 'max:80', Rule::unique('stand_legal_cases')->where('organization_id', $organizationId)],
            'title' => ['required', 'string', 'max:255'],
            'case_type' => ['required', Rule::in(['ownership_dispute', 'allocation_dispute', 'boundary_dispute', 'litigation', 'other'])],
            'status' => ['required', Rule::in(['open', 'pending', 'in_court', 'resolved', 'closed'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'court_name' => ['nullable', 'string', 'max:255'],
            'opposing_party' => ['nullable', 'string', 'max:255'],
            'opened_on' => ['nullable', 'date'],
            'next_hearing_on' => ['nullable', 'date'],
            'summary' => ['nullable', 'string', 'max:10000'],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->where('organization_id', $organizationId)],
        ];
    }

    private function authorizeStand(Request $request, Stand $stand, bool $manage = false): void
    {
        abort_unless($request->user()->can($manage ? 'phase-one.manage' : 'phase-one.view'), 403);
        abort_unless($stand->phase()->whereHas('development', fn (Builder $query) => $query
            ->where('organization_id', $request->user()->organization_id))->exists(), 404);
    }

    private function authorizeCase(Request $request, Stand $stand, StandLegalCase $legalCase, bool $manage = false): void
    {
        $this->authorizeStand($request, $stand, $manage);
        abort_unless((int) $legalCase->stand_id === (int) $stand->id
            && (int) $legalCase->organization_id === (int) $request->user()->organization_id, 404);
    }

    private function authorizeFile(Request $request, Stand $stand, StandLegalCase $legalCase, StandLegalCaseFile $file, bool $manage = false): void
    {
        $this->authorizeCase($request, $stand, $legalCase, $manage);
        abort_unless((int) $file->stand_legal_case_id === (int) $legalCase->id, 404);
    }
}
