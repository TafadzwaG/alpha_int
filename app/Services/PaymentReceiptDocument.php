<?php

namespace App\Services;

use App\Models\Payment;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\URL;

class PaymentReceiptDocument
{
    public function build(Payment $payment): ?array
    {
        $payment->loadMissing([
            'account.clientFile.client.organization',
            'branch',
            'method',
            'receipt.issuer',
            'allocations.charge',
            'allocations.installment',
        ]);

        if (! $payment->receipt) {
            return null;
        }

        $snapshot = $payment->receipt->snapshot_json ?? [];
        $client = $payment->account->clientFile->client;
        $amount = (float) ($snapshot['amount'] ?? $payment->amount);
        $lines = array_key_exists('allocations', $snapshot) && is_array($snapshot['allocations'])
            ? collect($snapshot['allocations'])->map(fn ($line) => [
                'description' => $line['charge'] ?? 'Account payment',
                'installment' => $line['installment'] ?? null,
                'amount' => (float) ($line['amount'] ?? 0),
            ])->values()
            : $payment->allocations->map(fn ($line) => [
                'description' => $line->charge?->description ?? $line->charge?->charge_type ?? 'Account payment',
                'installment' => $line->installment?->sequence_no,
                'amount' => (float) $line->amount,
            ])->values();
        $unapplied = max(0, round($amount - $lines->sum('amount'), 2));
        if ($unapplied > 0) {
            $lines->push(['description' => 'Payment received on account', 'installment' => null, 'amount' => $unapplied]);
        }

        $url = URL::signedRoute('administration.payments.verify', [
            'payment' => $payment->id,
            'receipt' => $payment->receipt->public_id,
        ]);
        $writer = new Writer(new ImageRenderer(new RendererStyle(240, 12), new SvgImageBackEnd));

        return [
            'company' => $client->organization?->legal_name ?? 'Alpha International Land Developers Private Limited',
            'trading_name' => $client->organization?->trading_name ?? 'Alpha Land',
            'number' => $payment->receipt->receipt_no,
            'issued_at' => $payment->receipt->issued_at?->toIso8601String(),
            'received_at' => $snapshot['received_at'] ?? $payment->received_at?->toIso8601String(),
            'client' => is_array($snapshot['client'] ?? null)
                ? ($snapshot['client']['name'] ?? trim($client->first_name.' '.$client->last_name))
                : ($snapshot['client'] ?? trim($client->first_name.' '.$client->last_name)),
            'client_no' => data_get($snapshot, 'client.number') ?? $client->client_no,
            'account' => $snapshot['account_no'] ?? $payment->account->account_no,
            'branch' => $snapshot['branch'] ?? $payment->branch?->name,
            'method' => $snapshot['method'] ?? $payment->method?->name,
            'reference' => $snapshot['reference'] ?? $payment->external_reference,
            'currency' => $snapshot['currency'] ?? $payment->currency_code,
            'amount' => $amount,
            'lines' => $lines->all(),
            'issued_by' => $payment->receipt->issuer?->name ?? 'System',
            'notes' => $snapshot['notes'] ?? null,
            'qr' => 'data:image/svg+xml;base64,'.base64_encode($writer->writeString($url)),
        ];
    }
}
