<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Currency;
use App\Models\DevelopmentPhase;
use App\Models\PaymentMethod;
use App\Models\StandType;
use App\Services\AuditLogger;
use App\Services\BranchAccessService;
use App\Services\GapWorkbookImporter;
use App\Services\GapWorkbookTemplate;
use App\Services\ImportContextOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GapWorkbookImportController extends Controller
{
    private const PREVIEW_SESSION_KEY = 'gap_workbook_import_preview';

    public function __construct(
        private readonly GapWorkbookImporter $importer,
        private readonly GapWorkbookTemplate $templates,
        private readonly BranchAccessService $branchAccess,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);
        $organizationId = (int) $request->user()->organization_id;

        return Inertia::render('property-operations/import', [
            'branches' => $this->branchAccess->availableBranches($request->user())->map(fn (Branch $branch) => [
                'value' => (string) $branch->id,
                'label' => "{$branch->name} ({$branch->code})",
            ])->values(),
            ...app(ImportContextOptions::class)->forOrganization($organizationId),
            'currencies' => Currency::query()
                ->where('active', true)
                ->orderBy('code')
                ->get()
                ->map(fn (Currency $currency) => ['value' => $currency->code, 'label' => "{$currency->code} — {$currency->name}"])
                ->values(),
            'paymentMethods' => PaymentMethod::query()
                ->where('active', true)
                ->orderBy('name')
                ->get()
                ->map(fn (PaymentMethod $method) => ['value' => (string) $method->id, 'label' => $method->name])
                ->values(),
            'defaults' => [
                'branch_id' => (string) $request->session()->get(BranchAccessService::SESSION_KEY, ''),
                'currency_code' => (string) $request->user()->organization?->base_currency_code,
            ],
            'importResult' => $request->session()->get('import_result'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);
        $mode = $request->validate([
            'mode' => ['required', Rule::in(['validate', 'import'])],
        ])['mode'];

        if ($mode === 'import') {
            return $this->importPreview($request);
        }

        $organizationId = (int) $request->user()->organization_id;
        $branchIds = $this->branchAccess->availableBranches($request->user())->pluck('id');
        $optionService = app(ImportContextOptions::class);
        $options = $optionService->forOrganization($organizationId);
        $phaseIds = $options['phases']->filter(fn ($option) => $optionService->eligible($option, (string) $request->input('branch_id')))->pluck('value');
        $standTypeIds = $options['standTypes']->filter(fn ($option) => $optionService->eligible($option, (string) $request->input('branch_id'), (string) $request->input('phase_id')))->pluck('value');

        $validated = $request->validate([
            'workbook' => ['required', 'file', 'mimes:xlsx', 'max:20480'],
            'branch_id' => ['required', Rule::in($branchIds->all())],
            'phase_id' => ['required', Rule::in($phaseIds->all())],
            'stand_type_id' => ['required', Rule::in($standTypeIds->all())],
            'currency_code' => ['required', Rule::exists('currencies', 'code')->where('active', 1)],
            'payment_method_id' => ['required', Rule::exists('payment_methods', 'id')->where('active', 1)],
        ]);

        $context = [
            'branch_id' => (int) $validated['branch_id'],
            'phase_id' => (int) $validated['phase_id'],
            'stand_type_id' => (int) $validated['stand_type_id'],
            'currency_code' => (string) $validated['currency_code'],
            'payment_method_id' => (int) $validated['payment_method_id'],
        ];
        $workbook = $validated['workbook'];
        $result = $this->importer->process($workbook, $context, $request->user(), false);

        $this->discardPreview($request);

        if ($result['valid']) {
            $token = (string) Str::uuid();
            $path = $workbook->storeAs('import-previews', "{$token}.xlsx", 'local');

            if (! $path) {
                throw ValidationException::withMessages([
                    'workbook' => 'The validated workbook could not be staged for import. Please try again.',
                ]);
            }

            $expiresAt = now()->addMinutes(30);
            $request->session()->put(self::PREVIEW_SESSION_KEY, [
                'token' => $token,
                'path' => $path,
                'filename' => $workbook->getClientOriginalName(),
                'user_id' => (int) $request->user()->id,
                'organization_id' => $organizationId,
                'context' => $context,
                'expires_at' => $expiresAt->toIso8601String(),
            ]);

            $result['preview_token'] = $token;
            $result['preview_expires_at'] = $expiresAt->toIso8601String();
            $result['context'] = $this->contextLabels($context);
        }

        return back()
            ->with('import_result', $result)
            ->with('success', $result['valid']
                ? 'Workbook validation passed. Review the preview before importing.'
                : 'Workbook validation found issues.');
    }

    private function importPreview(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'preview_token' => ['required', 'uuid'],
        ]);
        $preview = $request->session()->get(self::PREVIEW_SESSION_KEY);

        $isUsable = is_array($preview)
            && hash_equals((string) ($preview['token'] ?? ''), (string) $validated['preview_token'])
            && (int) ($preview['user_id'] ?? 0) === (int) $request->user()->id
            && (int) ($preview['organization_id'] ?? 0) === (int) $request->user()->organization_id
            && now()->lessThanOrEqualTo($preview['expires_at'] ?? now()->subMinute())
            && Storage::disk('local')->exists((string) ($preview['path'] ?? ''));

        if (! $isUsable) {
            $this->discardPreview($request);

            throw ValidationException::withMessages([
                'preview_token' => 'This preview has expired or is no longer available. Validate the workbook again.',
            ]);
        }

        $context = $preview['context'];
        $optionService = app(ImportContextOptions::class);
        $options = $optionService->forOrganization((int) $request->user()->organization_id);
        $phase = $options['phases']->firstWhere('value', (string) $context['phase_id']);
        $type = $options['standTypes']->firstWhere('value', (string) $context['stand_type_id']);
        if (! $this->branchAccess->availableBranches($request->user())->contains('id', $context['branch_id'])
            || ! $phase || ! $type
            || ! $optionService->eligible($phase, (string) $context['branch_id'])
            || ! $optionService->eligible($type, (string) $context['branch_id'], (string) $context['phase_id'])
            || ! PaymentMethod::whereKey($context['payment_method_id'])->where('active', true)->exists()) {
            throw ValidationException::withMessages(['preview_token' => 'The import context is no longer available. Select the branch context and validate again.']);
        }

        $file = new UploadedFile(
            Storage::disk('local')->path($preview['path']),
            $preview['filename'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true,
        );
        $result = $this->importer->process($file, $preview['context'], $request->user(), true);

        if ($result['imported'] ?? false) {
            $this->templates->store($file, (int) $request->user()->organization_id);
            $branch = Branch::findOrFail($preview['context']['branch_id']);
            $this->auditLogger->record($request, 'gaps-workbook.imported', $branch, null, [
                'filename' => $result['filename'],
                'counts' => $result['counts'],
                'recognized_sheets' => $result['recognized_sheets'],
            ]);
            $this->discardPreview($request);
        }

        return back()
            ->with('import_result', $result)
            ->with('success', ($result['imported'] ?? false)
                ? 'Workbook imported successfully.'
                : 'The staged workbook could not be imported. Validate it again.');
    }

    /** @param array{branch_id:int,phase_id:int,stand_type_id:int,currency_code:string,payment_method_id:int} $context */
    private function contextLabels(array $context): array
    {
        $phase = DevelopmentPhase::with('development:id,name')->findOrFail($context['phase_id']);

        return [
            'branch' => Branch::findOrFail($context['branch_id'])->name,
            'phase' => "{$phase->development->name} — {$phase->name}",
            'stand_type' => StandType::findOrFail($context['stand_type_id'])->name,
            'currency' => $context['currency_code'],
            'payment_method' => PaymentMethod::findOrFail($context['payment_method_id'])->name,
        ];
    }

    private function discardPreview(Request $request): void
    {
        $preview = $request->session()->pull(self::PREVIEW_SESSION_KEY);

        if (is_array($preview) && filled($preview['path'] ?? null)) {
            Storage::disk('local')->delete($preview['path']);
        }
    }
}
