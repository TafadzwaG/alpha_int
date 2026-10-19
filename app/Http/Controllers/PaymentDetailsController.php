<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\AllocationReportExport;
use App\Services\BranchAccessService;
use App\Services\PaymentReceiptDocument;
use App\Services\PhaseOneResourceRegistry;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentDetailsController extends Controller
{
    public function __construct(private readonly PaymentReceiptDocument $receiptDocuments) {}

    private function data(Request $request, Payment $payment): array
    {
        $payment->load(['account.clientFile.client', 'account.allocation.stand.phase.development', 'approvalRequest.steps.requiredRole', 'branch', 'method', 'receipt.issuer', 'maker', 'approver', 'allocations.charge', 'allocations.installment', 'reversal.requestedBy', 'reversal.reversedBy']);
        abort_unless((int) $payment->account?->clientFile?->client?->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless(app(BranchAccessService::class)->canAccess($request->user(), (int) $payment->branch_id), 404);
        $client = $payment->account->clientFile->client;

        $approval = $payment->approvalRequest;
        $canApprove = $payment->status === 'pending'
            && $approval?->status === 'pending'
            && $request->user()->can('payments.approve')
            && (int) $payment->made_by !== (int) $request->user()->id;

        return ['payment' => ['id' => $payment->id, 'public_id' => $payment->public_id, 'client_id' => $client->id, 'client' => trim($client->first_name.' '.$client->last_name), 'client_no' => $client->client_no, 'branch' => $payment->branch?->name, 'account' => $payment->account->account_no, 'amount' => (float) $payment->amount, 'currency' => $payment->currency_code, 'method' => $payment->method?->name, 'reference' => $payment->external_reference, 'received_at' => $payment->received_at?->toIso8601String(), 'status' => $payment->status, 'notes' => $payment->notes, 'recorded_by' => $payment->maker?->name, 'approved_by' => $payment->approver?->name, 'approved_at' => $payment->approved_at?->toIso8601String(), 'receipt_no' => $payment->receipt?->receipt_no, 'receipt_available' => $payment->status === 'approved' && $payment->receipt !== null, 'can_request_reversal' => $request->user()->can('accounting.post') && $payment->status === 'approved' && $payment->reversal === null, 'approval_request_id' => $approval?->id, 'approval_required_role' => $approval?->steps?->first()?->requiredRole?->name, 'can_approve' => $canApprove, 'is_maker' => (int) $payment->made_by === (int) $request->user()->id, 'reversal' => $payment->reversal ? ['status' => $payment->reversal->status, 'reason' => $payment->reversal->reason, 'requested_by' => $payment->reversal->requestedBy?->name, 'reversed_by' => $payment->reversal->reversedBy?->name, 'reversed_at' => $payment->reversal->reversed_at?->toIso8601String(), 'receipt_no' => $payment->reversal->reversal_receipt_no] : null],
            'paymentContext' => [
                'phone' => $client->phone_normalized,
                'client_status' => $client->status,
                'stand' => $payment->account?->allocation?->stand?->stand_no,
                'development' => $payment->account?->allocation?->stand?->phase?->development?->name,
                'allocation_status' => $payment->account?->allocation?->status,
            ],
            'receiptDocument' => $this->receiptDocuments->build($payment),
            'allocations' => $payment->allocations->map(fn ($a) => ['id' => $a->id, 'charge' => $a->charge?->description ?? $a->charge?->charge_type, 'installment' => $a->installment?->sequence_no, 'amount' => (float) $a->amount])->values()];
    }

    public function show(Request $request, Payment $payment)
    {
        return Inertia::render('payments/show', $this->data($request, $payment));
    }

    public function receipt(Request $request, Payment $payment)
    {
        $data = $this->data($request, $payment);
        abort_unless($data['payment']['receipt_available'], 409, 'An approved payment with an issued receipt is required.');
        $data['document'] = $data['receiptDocument'];

        $width = 80 / 25.4 * 72;
        $heightMm = 190 + (count($data['document']['lines']) * 16) + (filled($data['document']['notes']) ? 25 : 0);
        $height = $heightMm / 25.4 * 72;

        return Pdf::loadView('reports.payment-receipt', $data)
            ->setPaper([0, 0, $width, $height])
            ->download('pos-receipt-'.$data['document']['number'].'.pdf');
    }

    public function printReceipt(Request $request, Payment $payment)
    {
        $data = $this->data($request, $payment);
        abort_unless($data['payment']['receipt_available'], 409, 'An approved payment with an issued receipt is required.');

        return view('reports.client-receipts', [
            'clientName' => $data['payment']['client'],
            'documents' => collect([$data['receiptDocument']]),
            'print' => true,
            'toolbarLinks' => [
                ['label' => 'Back to payment', 'url' => url("/administration/payments/{$payment->id}")],
                ['label' => 'All payments', 'url' => url('/administration/payments')],
            ],
        ]);
    }

    public function verify(Request $request, Payment $payment)
    {
        $data = $this->data($request, $payment);
        abort_unless($request->hasValidSignature() && $data['payment']['receipt_available'] && $request->query('receipt') === $payment->receipt->public_id, 403);

        return Inertia::render('payments/show', [...$data, 'verified' => true]);
    }

    public function export(Request $request, string $format)
    {
        abort_unless(in_array($format, ['excel', 'pdf'], true), 404);
        $rows = app(PhaseOneResourceRegistry::class)->page('payments', $request, true)['records'];
        $keys = ['client_name', 'external_reference', 'method_name', 'amount', 'currency_code', 'received_at', 'status', 'notes'];
        $sections = ['Payments' => ['headers' => ['Client', 'Reference', 'Method', 'Amount', 'Currency', 'Received', 'Status', 'Notes'], 'rows' => $rows->map(fn ($r) => array_map(fn ($k) => $r[$k] ?? null, $keys))->all()]];
        if ($format === 'pdf') {
            return Pdf::loadView('reports.payments', ['sections' => $sections])->setPaper('a4', 'landscape')->download('payments.pdf');
        }

        return response()->download(app(AllocationReportExport::class)->excel(['allocation' => ['report' => 'Payments', 'records' => $rows->count()], 'sections' => $sections]), 'payments.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])->deleteFileAfterSend(true);
    }
}
