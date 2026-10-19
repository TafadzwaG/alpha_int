<?php

namespace App\Services;

use App\Models\DocumentSequence;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentReceiptService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function issue(Payment $payment, User $issuer, ?Request $request = null): Receipt
    {
        return DB::transaction(function () use ($payment, $issuer, $request): Receipt {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $existing = Receipt::query()->where('payment_id', $payment->id)->first();
            if ($existing) {
                return $existing;
            }

            $payment->loadMissing([
                'account.clientFile.client',
                'branch',
                'method',
                'allocations.charge',
                'allocations.installment',
            ]);

            $organizationId = (int) $payment->account->clientFile->client->organization_id;
            $issuedAt = now();
            $receiptNo = $this->nextNumber($organizationId, (int) $payment->branch_id, $issuedAt->year);
            $client = $payment->account->clientFile->client;
            $snapshot = [
                'receipt_no' => $receiptNo,
                'payment_public_id' => $payment->public_id,
                'client' => [
                    'number' => $client->client_no,
                    'name' => trim("{$client->first_name} {$client->last_name}"),
                ],
                'account_no' => $payment->account->account_no,
                'branch' => $payment->branch?->name,
                'amount' => (float) $payment->amount,
                'currency' => $payment->currency_code,
                'method' => $payment->method?->name,
                'reference' => $payment->external_reference,
                'received_at' => $payment->received_at?->toIso8601String(),
                'issued_at' => $issuedAt->toIso8601String(),
                'notes' => null,
                'allocations' => $payment->allocations->map(fn (PaymentAllocation $allocation): array => [
                    'charge' => $allocation->charge?->description ?? $allocation->charge?->charge_type ?? 'Account payment',
                    'installment' => $allocation->installment?->sequence_no,
                    'amount' => (float) $allocation->amount,
                ])->values()->all(),
            ];
            $encoded = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

            $receipt = Receipt::query()->create([
                'organization_id' => $organizationId,
                'payment_id' => $payment->id,
                'receipt_no' => $receiptNo,
                'issued_at' => $issuedAt,
                'content_hash' => hash('sha256', $encoded),
                'qr_token_hash' => hash('sha256', Str::random(64)),
                'snapshot_json' => $snapshot,
                'issued_by' => $issuer->id,
            ]);

            if ($request) {
                $this->auditLogger->record($request, 'receipts.issued', $receipt, null, [
                    'payment_id' => $payment->id,
                    'receipt_no' => $receiptNo,
                    'amount' => (float) $payment->amount,
                    'currency_code' => $payment->currency_code,
                ]);
            }

            return $receipt;
        });
    }

    private function nextNumber(int $organizationId, int $branchId, int $year): string
    {
        $sequence = DocumentSequence::query()->firstOrCreate(
            [
                'organization_id' => $organizationId,
                'branch_id' => $branchId,
                'document_type' => 'RECEIPT',
                'period_key' => (string) $year,
            ],
            ['prefix' => 'RCT', 'next_value' => 1, 'padding' => 6],
        );
        $sequence = DocumentSequence::query()->lockForUpdate()->findOrFail($sequence->id);
        $prefix = ($sequence->prefix ?: 'RCT').'-B'.$branchId;
        do {
            $number = $prefix.'-'.str_pad((string) $sequence->next_value, $sequence->padding, '0', STR_PAD_LEFT);
            $sequence->next_value++;
        } while (Receipt::query()->where('organization_id', $organizationId)->where('receipt_no', $number)->exists());
        $sequence->save();

        return $number;
    }
}
