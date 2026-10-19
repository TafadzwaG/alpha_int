<?php

namespace App\Http\Controllers;

use App\Models\AccountCharge;
use App\Models\CallCentreCampaign;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\ClientAccount;
use App\Models\ClientInteraction;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\StandLegalCase;
use App\Models\User;
use App\Services\AllocationReportExport;
use App\Services\BranchAccessService;
use App\Services\CallCentreService;
use App\Services\ClientProfileWorkbook;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class PropertyOperationsController extends Controller
{
    public function __construct(private readonly BranchAccessService $branchAccess) {}

    public function stand(Request $request, Stand $stand): Response
    {
        $organizationId = (int) $request->user()->organization_id;
        abort_unless($stand->phase()->whereHas('development', fn (Builder $query) => $query->where('organization_id', $organizationId))->exists(), 404);
        $branchIds = $this->branchAccess->branchIds($request->user());
        $stand->load([
            'phase.development:id,name,code,location',
            'standType:id,name,code',
            'allocations' => fn ($query) => $query
                ->when($branchIds !== null, fn ($builder) => $builder->whereIn('branch_id', $branchIds))
                ->with($this->allocationRelations())
                ->latest('allocated_at'),
            'legalCases' => fn ($query) => $query
                ->with(['creator:id,name', 'assignee:id,name', 'notes.creator:id,name', 'files.uploader:id,name'])
                ->orderByRaw("CASE WHEN status IN ('open', 'pending', 'in_court') THEN 0 ELSE 1 END")
                ->latest('opened_on')
                ->latest('id'),
        ]);

        $activeLegalCases = $stand->legalCases->filter->isActive();

        return Inertia::render('property-operations/stand-show', [
            'stand' => [
                'id' => $stand->id,
                'stand_no' => $stand->stand_no,
                'development' => $stand->phase?->development?->name,
                'development_code' => $stand->phase?->development?->code,
                'phase' => $stand->phase?->name,
                'location' => $stand->phase?->development?->location,
                'type' => $stand->standType?->name,
                'area_sqm' => (float) $stand->area_sqm,
                'list_price' => (float) $stand->list_price,
                'currency' => $stand->currency_code,
                'status' => $stand->physical_status,
                'survey_reference' => $stand->survey_reference,
                'legal_flagged' => $activeLegalCases->isNotEmpty(),
                'active_legal_cases_count' => $activeLegalCases->count(),
            ],
            'allocations' => $stand->allocations->map(fn (StandAllocation $allocation) => $this->allocationSummary($allocation))->values(),
            'legalCases' => $stand->legalCases->map(fn (StandLegalCase $legalCase) => [
                'id' => $legalCase->id,
                'case_number' => $legalCase->case_number,
                'title' => $legalCase->title,
                'case_type' => $legalCase->case_type,
                'status' => $legalCase->status,
                'priority' => $legalCase->priority,
                'court_name' => $legalCase->court_name,
                'opposing_party' => $legalCase->opposing_party,
                'opened_on' => $legalCase->opened_on?->toDateString(),
                'next_hearing_on' => $legalCase->next_hearing_on?->toDateString(),
                'resolved_at' => $legalCase->resolved_at?->toIso8601String(),
                'summary' => $legalCase->summary,
                'created_by' => $legalCase->creator?->name,
                'assigned_to' => $legalCase->assignee?->name,
                'assigned_to_id' => $legalCase->assigned_to,
                'notes' => $legalCase->notes->map(fn ($note) => [
                    'id' => $note->id,
                    'body' => $note->body,
                    'created_by' => $note->creator?->name,
                    'created_at' => $note->created_at?->toIso8601String(),
                ])->values(),
                'files' => $legalCase->files->map(fn ($file) => [
                    'id' => $file->id,
                    'original_name' => $file->original_name,
                    'mime_type' => $file->mime_type,
                    'size_bytes' => $file->size_bytes,
                    'uploaded_by' => $file->uploader?->name,
                    'created_at' => $file->created_at?->toIso8601String(),
                    'download_url' => route('administration.stands.legal-cases.files.download', [$stand, $legalCase, $file]),
                ])->values(),
            ])->values(),
            'legalCaseAssignees' => User::query()
                ->where('organization_id', $organizationId)
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user) => ['value' => (string) $user->id, 'label' => $user->name]),
            'canManage' => $request->user()->can('phase-one.manage'),
        ]);
    }

    public function client(Request $request, Client $client): Response
    {
        return Inertia::render('property-operations/client-show', $this->clientProfile($request, $client));
    }

    public function clientExport(Request $request, Client $client, string $format)
    {
        abort_unless(in_array($format, ['pdf', 'excel'], true), 404);
        $profile = $this->clientProfile($request, $client);
        $filename = 'client-profile-'.$client->id.'-'.now()->format('Y-m-d');
        if ($format === 'pdf') {
            $profile['verificationUrl'] = URL::signedRoute('administration.clients.verify', [
                'client' => $client->id,
                'issued' => now()->toIso8601String(),
                'reference' => $client->public_id,
            ]);
            $writer = new Writer(new ImageRenderer(new RendererStyle(240, 16), new SvgImageBackEnd));
            $profile['verificationQr'] = 'data:image/svg+xml;base64,'.base64_encode($writer->writeString($profile['verificationUrl']));

            return Pdf::loadView('reports.client-profile', $profile)->setPaper('a4', 'landscape')->download($filename.'.pdf');
        }

        return response()->download(app(ClientProfileWorkbook::class)->create($profile), $filename.'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function verifyClientProfile(Request $request, Client $client): Response
    {
        abort_unless($request->hasValidSignature() && $request->query('reference') === $client->public_id, 403);

        return Inertia::render('property-operations/client-show', [
            ...$this->clientProfile($request, $client),
            'verification' => ['issued' => $request->query('issued'), 'reference' => $client->public_id],
        ]);
    }

    private function clientProfile(Request $request, Client $client): array
    {
        abort_unless((int) $client->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $client->owning_branch_id), 404);
        $branchIds = $this->branchAccess->branchIds($request->user());
        $client->load([
            'owningBranch:id,name,code',
            'files' => fn ($query) => $query
                ->when($branchIds !== null, fn ($builder) => $builder->whereIn('branch_id', $branchIds))
                ->with([
                    'branch:id,name,code',
                    'accounts:id,client_file_id',
                    'allocations' => fn ($builder) => $builder->with($this->allocationRelations())->latest('allocated_at'),
                ]),
        ]);
        $allocations = $client->files->flatMap->allocations->map(fn (StandAllocation $allocation) => $this->allocationSummary($allocation))->values();
        $accountIds = $client->files->flatMap->accounts->pluck('id');
        $systemTimezone = $request->user()->organization?->timezone ?: config('app.timezone');
        $paymentAccounts = ClientAccount::query()
            ->whereIn('id', $accountIds)
            ->where('status', 'open')
            ->with([
                'clientFile.branch:id,name,timezone',
                'allocation.stand.phase.development:id,name',
                'charges' => fn ($query) => $query
                    ->whereNot('status', 'void')
                    ->withSum([
                        'paymentAllocations as approved_allocated' => fn ($paymentAllocations) => $paymentAllocations
                            ->whereHas('payment', fn ($payments) => $payments->where('status', 'approved')),
                    ], 'amount')
                    ->orderBy('due_date')
                    ->orderBy('id'),
            ])
            ->orderBy('account_no')
            ->get()
            ->map(function (ClientAccount $account) use ($client, $systemTimezone): array {
                $charges = $account->charges->map(function (AccountCharge $charge): array {
                    $outstanding = max(0, round((float) $charge->amount - (float) ($charge->approved_allocated ?? 0), 2));

                    return [
                        'id' => (string) $charge->id,
                        'description' => $charge->description ?: str($charge->charge_type)->headline()->toString(),
                        'type' => str($charge->charge_type)->headline()->toString(),
                        'due_date' => $charge->due_date?->toDateString(),
                        'original_amount' => (float) $charge->amount,
                        'outstanding' => $outstanding,
                    ];
                })->filter(fn (array $charge) => $charge['outstanding'] > 0.005)->values();

                return [
                    'id' => (string) $account->id,
                    'account_no' => $account->account_no,
                    'client' => trim("{$client->first_name} {$client->last_name}"),
                    'client_no' => $client->client_no,
                    'phone' => $client->phone_normalized,
                    'branch_id' => (string) $account->clientFile->branch_id,
                    'branch' => $account->clientFile->branch?->name,
                    'timezone' => $account->clientFile->branch?->timezone ?: $systemTimezone,
                    'currency' => $account->currency_code,
                    'stand' => $account->allocation?->stand?->stand_no,
                    'development' => $account->allocation?->stand?->phase?->development?->name,
                    'outstanding' => round((float) $charges->sum('outstanding'), 2),
                    'charges' => $charges,
                ];
            })->values();

        return [
            'client' => [
                'id' => $client->id,
                'public_id' => $client->public_id,
                'client_no' => $client->client_no,
                'name' => trim("{$client->first_name} {$client->middle_names} {$client->last_name}"),
                'phone' => $client->phone_normalized,
                'branch' => $client->owningBranch?->name,
                'branch_code' => $client->owningBranch?->code,
                'status' => $client->status,
                'files' => $client->files->map(fn ($file) => [
                    'id' => $file->id,
                    'file_no' => $file->file_no,
                    'branch' => $file->branch?->name,
                    'opened_at' => $file->opened_at?->toDateString(),
                    'status' => $file->lifecycle_status,
                ])->values(),
            ],
            'summary' => [
                'allocations' => $allocations->count(),
                'purchase_value' => (float) $allocations->sum('price'),
                'paid' => (float) $allocations->sum('paid'),
                'balance' => (float) $allocations->sum('balance'),
                'overdue_installments' => (int) $allocations->sum('overdue_installments'),
            ],
            'documents' => [
                'receipts' => Payment::query()
                    ->whereIn('account_id', $accountIds)
                    ->where('status', 'approved')
                    ->whereHas('receipt')
                    ->count(),
                'statements' => $accountIds->count(),
            ],
            'actions' => [
                'capturePayment' => $request->user()->can('payments.capture') || $request->user()->can('phase-one.manage'),
                'callCentre' => $request->user()->can('call-centre.view'),
                'recordCall' => $request->user()->can('call-centre.view') && $request->user()->can('call-centre.interactions.create'),
                'followUp' => $request->user()->can('call-centre.view') && $request->user()->can('call-centre.tasks.manage'),
                'assignTasks' => $request->user()->can('call-centre.tasks.assign'),
            ],
            'agents' => $request->user()->can('call-centre.view') ? app(CallCentreService::class)->eligibleAgentOptions((int) $client->owning_branch_id) : [],
            'campaigns' => $request->user()->can('call-centre.view') ? CallCentreCampaign::query()->where('branch_id', $client->owning_branch_id)->whereIn('status', ['draft', 'active'])->get()->map(fn ($campaign) => ['value' => (string) $campaign->id, 'label' => $campaign->name]) : [],
            'paymentOptions' => [
                'accounts' => $paymentAccounts,
                'systemTimezone' => $systemTimezone,
                'methods' => PaymentMethod::query()->where('active', true)->orderBy('name')->get()->map(fn ($method) => [
                    'id' => (string) $method->id,
                    'name' => $method->name,
                    'requires_reference' => $method->requires_reference,
                    'cash_equivalent' => $method->cash_equivalent,
                ]),
                'cashSessions' => CashSession::query()
                    ->whereIn('branch_id', $client->files->pluck('branch_id'))
                    ->where('status', 'open')
                    ->with(['branch:id,name', 'cashier:id,name'])
                    ->latest('opened_at')
                    ->get()
                    ->map(fn ($session) => [
                        'id' => (string) $session->id,
                        'branch_id' => (string) $session->branch_id,
                        'currency' => $session->currency_code,
                        'label' => "{$session->branch?->name} - {$session->cashier?->name} ({$session->currency_code})",
                    ]),
            ],
            'callHistory' => ClientInteraction::query()->where('client_id', $client->id)
                ->where('channel', 'phone')
                ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))
                ->with(['creator:id,name', 'branch:id,name'])
                ->orderByDesc('occurred_at')->orderByDesc('id')->get()
                ->map(fn ($call) => [
                    'id' => $call->id,
                    'occurred_at' => ($call->occurred_at ?? $call->created_at)?->toIso8601String(),
                    'agent' => $call->creator?->name ?? 'Unknown agent',
                    'branch' => $call->branch?->name,
                    'direction' => $call->direction,
                    'duration_seconds' => $call->duration_seconds,
                    'outcome' => $call->outcome,
                    'summary' => $call->summary,
                ])->values(),
            'allocations' => $allocations,
            'canManage' => $request->user()->can('phase-one.manage'),
        ];
    }

    public function allocation(Request $request, StandAllocation $standAllocation): Response
    {
        return Inertia::render('property-operations/allocation-show', $this->allocationReport($request, $standAllocation));
    }

    public function allocationExport(Request $request, StandAllocation $standAllocation, string $format)
    {
        abort_unless(in_array($format, ['excel', 'pdf'], true), 404);
        $report = $this->allocationReport($request, $standAllocation);
        $export = app(AllocationReportExport::class);
        $report['sections'] = $export->sections($report);
        $filename = 'allocation-'.$standAllocation->id.'-'.now()->format('Y-m-d');
        if ($format === 'pdf') {
            return Pdf::loadView('reports.allocation', $report)->setPaper('a4', 'landscape')->download($filename.'.pdf');
        }

        return response()->download($export->excel($report), $filename.'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function allocationReport(Request $request, StandAllocation $standAllocation): array
    {
        $standAllocation->load($this->allocationRelations());
        abort_unless((int) $standAllocation->clientFile?->client?->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $standAllocation->branch_id), 404);

        $account = $standAllocation->account;
        $installments = $standAllocation->installments->sortBy('sequence_no')->map(fn (Installment $installment) => $this->installmentData($installment))->values();
        $payments = $account?->payments?->sortByDesc('received_at')->map(fn ($payment) => [
            'id' => $payment->id,
            'public_id' => $payment->public_id,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency_code,
            'method' => $payment->method?->name,
            'reference' => $payment->external_reference,
            'notes' => $payment->notes,
            'received_at' => $payment->received_at?->toIso8601String(),
            'status' => $payment->status,
            'receipt_no' => $payment->receipt?->receipt_no,
            'installment_numbers' => $payment->allocations->pluck('installment.sequence_no')->filter()->values(),
        ])->values() ?? collect();
        $reminders = $standAllocation->installments->flatMap->reminders->sortByDesc('remind_at')->map(fn ($reminder) => [
            'id' => $reminder->id,
            'installment_id' => $reminder->installment_id,
            'installment_no' => $reminder->installment?->sequence_no,
            'channel' => $reminder->channel,
            'remind_at' => $reminder->remind_at?->toIso8601String(),
            'status' => $reminder->status,
            'sent_at' => $reminder->sent_at?->toIso8601String(),
            'notes' => $reminder->notes,
            'created_by' => $reminder->creator?->name,
        ])->values();
        $summary = $this->allocationSummary($standAllocation);
        $timeline = collect([[
            'type' => 'allocation',
            'title' => 'Stand allocated',
            'description' => $standAllocation->stand ? "Stand {$standAllocation->stand->stand_no} allocated to {$summary['client']}" : 'Allocation opened',
            'occurred_at' => $standAllocation->allocated_at?->toIso8601String() ?? $standAllocation->created_at?->toIso8601String(),
        ]])->merge($payments->map(fn (array $payment) => [
            'type' => 'payment',
            'title' => "Payment {$payment['currency']} ".number_format($payment['amount'], 2),
            'description' => trim(($payment['method'] ?? 'Payment').($payment['receipt_no'] ? " · Receipt {$payment['receipt_no']}" : '')),
            'occurred_at' => $payment['received_at'],
        ]))->merge($reminders->map(fn (array $reminder) => [
            'type' => 'reminder',
            'title' => ucfirst($reminder['status'])." {$reminder['channel']} reminder",
            'description' => "Installment #{$reminder['installment_no']}".($reminder['notes'] ? " · {$reminder['notes']}" : ''),
            'occurred_at' => $reminder['sent_at'] ?? $reminder['remind_at'],
        ]))->filter(fn (array $event) => $event['occurred_at'])->sortByDesc('occurred_at')->values();

        return [
            'allocation' => $summary,
            'account' => $account ? ['id' => $account->id, 'account_no' => $account->account_no, 'currency' => $account->currency_code, 'status' => $account->status] : null,
            'installments' => $installments,
            'payments' => $payments,
            'reminders' => $reminders,
            'timeline' => $timeline,
            'paymentMethods' => PaymentMethod::query()->where('active', true)->orderBy('name')->get()->map(fn (PaymentMethod $method) => [
                'id' => (string) $method->id,
                'name' => $method->name,
                'requires_reference' => $method->requires_reference,
                'cash_equivalent' => $method->cash_equivalent,
            ])->values(),
            'cashSessions' => CashSession::query()->where('branch_id', $standAllocation->branch_id)->where('currency_code', $account?->currency_code ?? $standAllocation->currency_code)->where('status', 'open')->with('cashier:id,name')->latest('opened_at')->get()->map(fn (CashSession $session) => [
                'id' => (string) $session->id,
                'label' => "Session #{$session->id} · {$session->cashier?->name}",
            ]),
            'canManage' => $request->user()->can('phase-one.manage'),
        ];
    }

    private function allocationRelations(): array
    {
        return [
            'clientFile.client:id,organization_id,owning_branch_id,client_no,first_name,middle_names,last_name,phone_normalized,status',
            'branch:id,name,code',
            'stand.phase.development:id,name,code',
            'account.charges.paymentAllocations.payment:id,status',
            'account.payments.method:id,name',
            'account.payments.receipt:id,payment_id,receipt_no',
            'account.payments.allocations.installment:id,sequence_no',
            'installments.paymentAllocations.payment:id,status',
            'installments.reminders.creator:id,name',
            'installments.reminders.installment:id,sequence_no',
        ];
    }

    private function allocationSummary(StandAllocation $allocation): array
    {
        $account = $allocation->account;
        $charges = $account?->charges?->where('status', '!=', 'void') ?? collect();
        $charged = (float) $charges->sum('amount');
        $paid = (float) $charges->flatMap->paymentAllocations->filter(fn (PaymentAllocation $item) => $item->payment?->status === 'approved')->sum('amount');
        $installments = $allocation->installments->map(fn (Installment $installment) => $this->installmentData($installment));
        $nextDue = $installments->whereNotIn('effective_status', ['paid', 'waived'])->sortBy('due_date')->first();

        return [
            'id' => $allocation->id,
            'client_id' => $allocation->clientFile?->client?->id,
            'client_no' => $allocation->clientFile?->client?->client_no,
            'client' => trim("{$allocation->clientFile?->client?->first_name} {$allocation->clientFile?->client?->last_name}"),
            'phone' => $allocation->clientFile?->client?->phone_normalized,
            'stand_id' => $allocation->stand?->id,
            'stand_no' => $allocation->stand?->stand_no,
            'development' => $allocation->stand?->phase?->development?->name,
            'branch' => $allocation->branch?->name,
            'branch_code' => $allocation->branch?->code,
            'category' => $allocation->category,
            'allocated_at' => $allocation->allocated_at?->toDateString(),
            'price' => (float) ($allocation->effective_price ?? $charged),
            'charged' => $charged,
            'paid' => $paid,
            'balance' => max(0, $charged - $paid),
            'currency' => $allocation->currency_code ?? $account?->currency_code ?? 'USD',
            'status' => $allocation->status,
            'account_no' => $account?->account_no,
            'account_id' => $account?->id,
            'next_due_date' => $nextDue['due_date'] ?? null,
            'next_due_amount' => $nextDue ? max(0, $nextDue['amount_due'] - $nextDue['amount_paid']) : 0,
            'overdue_installments' => $installments->where('effective_status', 'overdue')->count(),
            'installment_count' => $installments->count(),
        ];
    }

    private function installmentData(Installment $installment): array
    {
        $amountPaid = (float) $installment->amount_paid;
        $effectiveStatus = match (true) {
            $installment->status === 'waived' => 'waived',
            $amountPaid >= (float) $installment->amount_due => 'paid',
            $installment->due_date->isBefore(today()) => 'overdue',
            $amountPaid > 0 => 'partially_paid',
            default => 'scheduled',
        };

        return [
            'id' => $installment->id,
            'sequence_no' => $installment->sequence_no,
            'due_date' => $installment->due_date->toDateString(),
            'amount_due' => (float) $installment->amount_due,
            'amount_paid' => $amountPaid,
            'balance' => max(0, (float) $installment->amount_due - $amountPaid),
            'currency' => $installment->currency_code,
            'status' => $installment->status,
            'effective_status' => $effectiveStatus,
            'paid_at' => $installment->paid_at?->toIso8601String(),
            'notes' => $installment->notes,
            'reminder_count' => $installment->reminders->count(),
        ];
    }
}
