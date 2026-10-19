<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Payment;
use App\Services\AccountingService;
use App\Services\BranchAccessService;
use App\Services\PaymentReceiptDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ClientDocumentController extends Controller
{
    public function __construct(
        private readonly BranchAccessService $branchAccess,
        private readonly PaymentReceiptDocument $receiptDocuments,
        private readonly AccountingService $accounting,
    ) {}

    public function receiptsPdf(Request $request, Client $client)
    {
        $documents = $this->receiptDocuments($request, $client);
        abort_if($documents->isEmpty(), 404, 'This client has no issued receipts to download.');
        $filename = 'receipts-'.$this->filename($client).'-'.today()->format('Y-m-d').'.pdf';
        $width = 80 / 25.4 * 72;
        $height = 210 / 25.4 * 72;

        return Pdf::loadView('reports.client-receipts', [
            'clientName' => $this->clientName($client),
            'documents' => $documents,
            'print' => false,
        ])->setPaper([0, 0, $width, $height])->download($filename);
    }

    public function receiptsPrint(Request $request, Client $client)
    {
        $documents = $this->receiptDocuments($request, $client);
        abort_if($documents->isEmpty(), 404, 'This client has no issued receipts to print.');

        return view('reports.client-receipts', [
            'clientName' => $this->clientName($client),
            'documents' => $documents,
            'print' => true,
            'toolbarLinks' => [
                ['label' => 'Back to client', 'url' => url("/administration/clients/{$client->id}")],
                ['label' => 'Receipt register', 'url' => url('/administration/receipts')],
            ],
        ]);
    }

    public function statementPdf(Request $request, Client $client)
    {
        $statements = $this->statements($request, $client);
        abort_if($statements->isEmpty(), 404, 'This client has no account statements to download.');
        $filename = 'statement-'.$this->filename($client).'-'.today()->format('Y-m-d').'.pdf';

        return Pdf::loadView('reports.client-statements', [
            'clientName' => $this->clientName($client),
            'statements' => $statements,
            'print' => false,
        ])->setPaper('a4', 'portrait')->download($filename);
    }

    public function statementPrint(Request $request, Client $client)
    {
        $statements = $this->statements($request, $client);
        abort_if($statements->isEmpty(), 404, 'This client has no account statements to print.');

        return view('reports.client-statements', [
            'clientName' => $this->clientName($client),
            'statements' => $statements,
            'print' => true,
            'clientUrl' => route('administration.clients.show', $client),
            'downloadUrl' => route('administration.clients.statement.pdf', $client),
        ]);
    }

    private function receiptDocuments(Request $request, Client $client): Collection
    {
        $this->authorizeClient($request, $client);
        $branchIds = $this->branchAccess->branchIds($request->user());

        return Payment::query()
            ->where('status', 'approved')
            ->whereHas('receipt')
            ->whereHas('account.clientFile', fn ($query) => $query->where('client_id', $client->id))
            ->when($branchIds !== null, fn ($query) => $query->whereIn('branch_id', $branchIds))
            ->with([
                'account.clientFile.client.organization',
                'branch',
                'method',
                'receipt.issuer',
                'allocations.charge',
                'allocations.installment',
            ])
            ->oldest('received_at')
            ->get()
            ->map(fn (Payment $payment) => $this->receiptDocuments->build($payment))
            ->filter()
            ->values();
    }

    private function statements(Request $request, Client $client): Collection
    {
        $this->authorizeClient($request, $client);
        $client->load(['files.branch', 'files.accounts']);

        return $client->files
            ->filter(fn ($file) => $this->branchAccess->canAccess($request->user(), (int) $file->branch_id))
            ->flatMap(fn ($file) => $file->accounts->map(fn ($account) => $this->accounting->debtorStatementForAccount(
                $request->user(),
                (int) $account->id,
                (int) $file->branch_id,
            )))
            ->filter()
            ->values();
    }

    private function authorizeClient(Request $request, Client $client): void
    {
        abort_unless((int) $client->organization_id === (int) $request->user()->organization_id, 404);
        abort_unless($this->branchAccess->canAccess($request->user(), (int) $client->owning_branch_id), 404);
    }

    private function clientName(Client $client): string
    {
        return trim(implode(' ', array_filter([$client->first_name, $client->middle_names, $client->last_name])));
    }

    private function filename(Client $client): string
    {
        return Str::slug($client->client_no.'-'.$this->clientName($client));
    }
}
