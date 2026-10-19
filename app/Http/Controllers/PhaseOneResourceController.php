<?php

namespace App\Http\Controllers;

use App\Models\DevelopmentPhase;
use App\Models\Stand;
use App\Services\AllocationReportExport;
use App\Services\AuditLogger;
use App\Services\FinanceRegister;
use App\Services\PhaseOneResourceRegistry;
use App\Services\StandBulkWorkbook;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PhaseOneResourceController extends Controller
{
    private const STAND_BULK_SESSION_KEY = 'stand_bulk_preview';

    public function __construct(
        private readonly PhaseOneResourceRegistry $registry,
        private readonly StandBulkWorkbook $standBulkWorkbook,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(string $resource, Request $request): Response
    {
        if (in_array($resource, ['developments', 'development-phases', 'stand-types'], true)) {
            abort_unless($request->user()->hasAnyRole(['Super Administrator', 'System Administrator']), 403);
        }
        if (in_array($resource, ['expenses', 'petty-cash-entries'], true)) {
            abort_unless($request->user()->can('expenses.view'), 403);
        }
        if ($resource === 'audit-events') {
            abort_unless($request->user()->can('audit.view'), 403);
        }

        $page = $this->registry->page($resource, $request);
        if ($resource === 'stands') {
            $page['bulkStandPreview'] = $request->session()->get('stand_bulk_preview_result');
        }

        return Inertia::render('administration/resource', $page);
    }

    public function exportFinance(Request $request, string $resource, string $format)
    {
        abort_unless(in_array($resource, FinanceRegister::KEYS, true) && in_array($format, ['excel', 'pdf'], true), 404);
        if (in_array($resource, ['expenses', 'petty-cash-entries'], true)) {
            abort_unless($request->user()->can('expenses.view'), 403);
        }
        $page = $this->registry->page($resource, $request, true);
        $columns = $page['resource']['columns'];
        $rows = $page['records'];
        $sections = [$page['resource']['title'] => [
            'headers' => array_column($columns, 'label'),
            'rows' => $rows->map(fn ($row) => array_map(fn ($column) => $row[$column['key']] ?? null, $columns))->all(),
        ]];
        if ($format === 'pdf') {
            if ($rows->count() > 500) {
                throw ValidationException::withMessages(['export' => 'Narrow the filters to 500 records or fewer for a PDF, or export Excel.']);
            }

            return Pdf::loadView('reports.finance-register', ['title' => $page['resource']['title'], 'sections' => $sections])->setPaper('a4', 'landscape')->download($resource.'.pdf');
        }

        return response()->download(app(AllocationReportExport::class)->excel(['allocation' => ['report' => $page['resource']['title'], 'records' => $rows->count()], 'sections' => $sections]), $resource.'.xlsx')->deleteFileAfterSend(true);
    }

    public function exportStands(Request $request, string $format)
    {
        abort_unless(in_array($format, ['excel', 'pdf'], true), 404);
        $rows = $this->registry->page('stands', $request, true)['records'];
        $columns = ['stand_no' => 'Stand', 'phase_name' => 'Development phase', 'stand_type_name' => 'Type', 'area_sqm' => 'Area (m²)', 'list_price' => 'List price', 'currency_code' => 'Currency', 'physical_status' => 'Status', 'allocated_to' => 'Allocated to'];
        $rows = $rows->map(function ($row) {
            $row['allocated_to'] = collect($row['allocated_clients'])->map(fn ($client) => $client['name'].' ('.$client['number'].')')->join('; ');

            return $row;
        });
        $sections = ['Stands' => ['headers' => array_values($columns), 'rows' => $rows->map(fn ($row) => array_map(fn ($key) => $row[$key] ?? null, array_keys($columns)))->all()]];
        if ($format === 'pdf') {
            return Pdf::loadView('reports.stands', ['sections' => $sections])->setPaper('a4', 'landscape')->download('stands-'.now()->format('Y-m-d').'.pdf');
        }
        $path = app(AllocationReportExport::class)->excel(['allocation' => ['report' => 'Stand directory', 'records' => $rows->count()], 'sections' => $sections]);

        return response()->download($path, 'stands-'.now()->format('Y-m-d').'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])->deleteFileAfterSend(true);
    }

    public function exportClients(Request $request, string $format)
    {
        abort_unless(in_array($format, ['excel', 'pdf'], true), 404);
        $rows = $this->registry->page('clients', $request, true)['records']->map(function ($row) {
            $lastPayment = $row['last_payment'];
            $payment = $row['next_payment'];
            $followUp = $row['next_follow_up'];

            return [$row['client_no'], preg_replace('/\s+/', ' ', $row['client_name']), $row['branch_name'], $row['phone_normalized'], $row['status'],
                $lastPayment['date'] ?? null, $lastPayment['currency'] ?? null, $lastPayment['amount'] ?? null,
                $payment['date'] ?? null, $payment['currency'] ?? null, $payment['amount'] ?? null,
                $payment ? ($payment['overdue'] ? 'Overdue' : 'Upcoming') : 'Not scheduled',
                $followUp['date'] ?? null, $followUp['type'] ?? null,
                $followUp ? ($followUp['overdue'] ? 'Overdue' : 'Upcoming') : 'Not scheduled'];
        });
        $sections = ['Clients' => ['headers' => ['Client number', 'Name', 'Branch', 'Phone', 'Status', 'Last payment', 'Last payment currency', 'Last payment amount', 'Payment due', 'Currency', 'Amount due', 'Payment status', 'Follow-up date', 'Follow-up type', 'Follow-up status'], 'rows' => $rows->all()]];
        if ($format === 'pdf') {
            return Pdf::loadView('reports.clients', ['sections' => $sections])->setPaper('a3', 'landscape')->download('clients-'.now()->format('Y-m-d').'.pdf');
        }
        $path = app(AllocationReportExport::class)->excel(['allocation' => ['report' => 'Client directory', 'records' => $rows->count()], 'sections' => $sections]);

        return response()->download($path, 'clients-'.now()->format('Y-m-d').'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])->deleteFileAfterSend(true);
    }

    public function bulkStandsTemplate(Request $request)
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);

        return response()->download(
            $this->standBulkWorkbook->template(),
            'alpha-land-stand-import-template.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        )->deleteFileAfterSend(true);
    }

    public function previewBulkStands(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);
        $validated = $this->validateStandBulkContext($request);
        $sourceMode = (string) $validated['source_mode'];
        $rows = $request->input('stands', []);
        $parserIssues = [];
        $filename = null;

        if ($sourceMode === 'upload') {
            $parsed = $this->standBulkWorkbook->parse($request->file('workbook'));
            $rows = $parsed['rows'];
            $parserIssues = $parsed['issues'];
            $filename = $parsed['filename'];
        }

        $context = [
            'phase_id' => (int) $validated['phase_id'],
            'stand_type_id' => (int) $validated['stand_type_id'],
            'currency_code' => (string) $validated['currency_code'],
            'physical_status' => (string) $validated['physical_status'],
            'shared_list_price' => filled($validated['shared_list_price'] ?? null) ? (float) $validated['shared_list_price'] : null,
        ];
        $result = $this->standBulkWorkbook->preview(is_array($rows) ? $rows : [], $context, $parserIssues, $filename);

        $request->session()->forget(self::STAND_BULK_SESSION_KEY);
        if ($result['valid']) {
            $token = (string) Str::uuid();
            $expiresAt = now()->addMinutes(30);
            $inputRows = collect($result['rows'])->map(fn (array $row) => [
                'source_row' => $row['source_row'],
                'stand_no' => $row['stand_no'],
                'area_sqm' => $row['area_sqm'],
                'list_price' => $row['list_price'],
                'survey_reference' => $row['survey_reference'],
            ])->all();
            $request->session()->put(self::STAND_BULK_SESSION_KEY, [
                'token' => $token,
                'user_id' => (int) $request->user()->id,
                'organization_id' => (int) $request->user()->organization_id,
                'context' => $context,
                'rows' => $inputRows,
                'expires_at' => $expiresAt->toIso8601String(),
            ]);
            $result['preview_token'] = $token;
            $result['preview_expires_at'] = $expiresAt->toIso8601String();
        }

        return back()->with('stand_bulk_preview_result', $result);
    }

    public function bulkStands(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('phase-one.manage'), 403);
        $validated = $request->validate(['preview_token' => ['required', 'uuid']]);
        $stage = $request->session()->get(self::STAND_BULK_SESSION_KEY);
        $usable = is_array($stage)
            && hash_equals((string) ($stage['token'] ?? ''), (string) $validated['preview_token'])
            && (int) ($stage['user_id'] ?? 0) === (int) $request->user()->id
            && (int) ($stage['organization_id'] ?? 0) === (int) $request->user()->organization_id
            && now()->lessThanOrEqualTo($stage['expires_at'] ?? now()->subMinute())
            && $this->standBulkContextExists($stage['context'] ?? [], (int) $request->user()->organization_id);

        if (! $usable) {
            $request->session()->forget(self::STAND_BULK_SESSION_KEY);
            throw ValidationException::withMessages(['preview_token' => 'This preview has expired or its shared settings are no longer available. Validate the stands again.']);
        }

        $result = $this->standBulkWorkbook->preview($stage['rows'], $stage['context']);
        if (! $result['valid']) {
            $request->session()->forget(self::STAND_BULK_SESSION_KEY);
            $message = $result['issues'][0]
                ?? collect($result['rows'])->flatMap(fn (array $row) => $row['errors'])->first()
                ?? 'The stand data is no longer valid. Validate it again.';
            throw ValidationException::withMessages(['preview_token' => $message]);
        }

        $now = now();
        $payloads = collect($result['rows'])->map(fn (array $row) => [
            'phase_id' => $stage['context']['phase_id'],
            'stand_type_id' => $stage['context']['stand_type_id'],
            'stand_no' => $row['stand_no'],
            'area_sqm' => $row['area_sqm'],
            'list_price' => $row['effective_list_price'],
            'currency_code' => $stage['context']['currency_code'],
            'physical_status' => $stage['context']['physical_status'],
            'survey_reference' => $row['survey_reference'] ?: null,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        try {
            DB::transaction(function () use ($payloads, $request, $stage) {
                foreach (array_chunk($payloads, 100) as $chunk) {
                    Stand::query()->insert($chunk);
                }

                $phase = DevelopmentPhase::with('development')->findOrFail($stage['context']['phase_id']);
                $this->auditLogger->record($request, 'stands.bulk-created', $phase->development, null, [
                    'phase_id' => $phase->id,
                    'phase' => $phase->name,
                    'stand_type_id' => $stage['context']['stand_type_id'],
                    'currency_code' => $stage['context']['currency_code'],
                    'physical_status' => $stage['context']['physical_status'],
                    'stand_count' => count($payloads),
                    'first_stand' => $payloads[0]['stand_no'] ?? null,
                    'last_stand' => $payloads[array_key_last($payloads)]['stand_no'] ?? null,
                ]);
            });
        } catch (QueryException) {
            throw ValidationException::withMessages(['preview_token' => 'One or more stand numbers were registered after this preview was created. Validate the batch again.']);
        }

        $request->session()->forget(self::STAND_BULK_SESSION_KEY);

        return back()->with('success', count($payloads).' stands recorded successfully.');
    }

    /** @return array<string,mixed> */
    private function validateStandBulkContext(Request $request): array
    {
        $organizationId = (int) $request->user()->organization_id;
        $phaseIds = DevelopmentPhase::query()
            ->whereHas('development', fn ($query) => $query->where('organization_id', $organizationId))
            ->pluck('id');

        return $request->validate([
            'source_mode' => ['required', Rule::in(['paste', 'upload', 'manual'])],
            'phase_id' => ['required', Rule::exists('development_phases', 'id')->whereIn('id', $phaseIds->all())],
            'stand_type_id' => ['required', Rule::exists('stand_types', 'id')->where('organization_id', $organizationId)->where('active', true)],
            'currency_code' => ['required', 'string', 'size:3', Rule::exists('currencies', 'code')->where('active', true)],
            'physical_status' => ['required', Rule::in(['planned', 'available', 'reserved', 'allocated', 'withdrawn'])],
            'shared_list_price' => ['nullable', 'numeric', 'min:0'],
            'workbook' => [Rule::requiredIf($request->input('source_mode') === 'upload'), 'nullable', 'file', 'mimes:xlsx', 'max:20480'],
            'stands' => [Rule::requiredIf($request->input('source_mode') !== 'upload'), 'nullable', 'array', 'max:501'],
        ]);
    }

    private function standBulkContextExists(array $context, int $organizationId): bool
    {
        return DevelopmentPhase::query()
            ->whereKey($context['phase_id'] ?? 0)
            ->whereHas('development', fn ($query) => $query->where('organization_id', $organizationId))
            ->exists()
            && DB::table('stand_types')->where('id', $context['stand_type_id'] ?? 0)->where('organization_id', $organizationId)->where('active', true)->exists()
            && DB::table('currencies')->where('code', $context['currency_code'] ?? '')->where('active', true)->exists()
            && in_array($context['physical_status'] ?? '', ['planned', 'available', 'reserved', 'allocated', 'withdrawn'], true);
    }

    public function store(string $resource, Request $request): RedirectResponse
    {
        $permission = in_array($resource, ['expenses', 'petty-cash-entries'], true) ? 'expenses.manage' : 'phase-one.manage';
        abort_unless($request->user()->can($permission), 403);
        $this->registry->create($resource, $request);

        return back()->with('success', 'Record created successfully.');
    }

    public function update(string $resource, string $record, Request $request): RedirectResponse
    {
        $permission = in_array($resource, ['expenses', 'petty-cash-entries'], true) ? 'expenses.manage' : 'phase-one.manage';
        abort_unless($request->user()->can($permission), 403);
        $this->registry->update($resource, $record, $request);

        return back()->with('success', 'Record updated successfully.');
    }

    public function destroy(string $resource, string $record, Request $request): RedirectResponse
    {
        $permission = in_array($resource, ['expenses', 'petty-cash-entries'], true) ? 'expenses.manage' : 'phase-one.manage';
        abort_unless($request->user()->can($permission), 403);
        $this->registry->remove($resource, $record, $request);

        return back()->with('success', 'Record removed from active use.');
    }
}
