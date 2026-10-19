<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\CustomerInvoice;
use App\Models\Organization;

class CustomerInvoiceDocument
{
    public function data(CustomerInvoice $invoice): array
    {
        $invoice->loadMissing([
            'branch:id,name,address,phone,email',
            'account.clientFile.client.contacts',
            'account.allocation.stand.phase.development',
            'lines.item:id,code,name,unit_of_measure',
            'lines.revenueAccount:id,code,name',
        ]);
        $organization = Organization::query()->findOrFail($invoice->organization_id);
        $client = $invoice->account->clientFile->client;
        $contacts = $client->contacts;
        $email = $contacts->first(fn ($contact) => $contact->type === 'email' && $contact->normalized_value)?->normalized_value;
        $phone = $client->phone_normalized
            ?: $contacts->first(fn ($contact) => $contact->type === 'phone' && $contact->normalized_value)?->normalized_value;
        $bank = BankAccount::query()
            ->where('organization_id', $invoice->organization_id)
            ->where('currency_code', $invoice->currency_code)
            ->where('active', true)
            ->orderByRaw('CASE WHEN branch_id = ? THEN 0 ELSE 1 END', [$invoice->branch_id])
            ->first();
        $taxCodes = $invoice->lines->pluck('tax_code')->filter()->unique()->implode(', ');
        $stand = $invoice->account->allocation?->stand;

        return [
            'seller' => [
                'legal_name' => $organization->legal_name,
                'trading_name' => $organization->trading_name,
                'registration_no' => $organization->registration_no,
                'address' => $invoice->branch->address,
                'phone' => $invoice->branch->phone,
                'email' => $invoice->branch->email,
                'branch' => $invoice->branch->name,
            ],
            'invoice' => [
                'number' => $invoice->invoice_no,
                'date' => $invoice->invoice_date,
                'due_date' => $invoice->due_date,
                'currency' => $invoice->currency_code,
                'status' => $invoice->status,
                'description' => $invoice->description,
                'subtotal' => (float) $invoice->subtotal,
                'discount' => 0.0,
                'tax' => (float) $invoice->tax_amount,
                'total' => (float) $invoice->total_amount,
                'paid' => (float) $invoice->paid_amount,
                'balance' => round((float) $invoice->total_amount - (float) $invoice->paid_amount, 4),
            ],
            'buyer' => [
                'name' => trim($client->first_name.' '.$client->middle_names.' '.$client->last_name),
                'client_no' => $client->client_no,
                'account_no' => $invoice->account->account_no,
                'phone' => $phone,
                'email' => $email,
                'address' => null,
                'stand' => $stand?->stand_no,
                'delivery' => $stand
                    ? trim(($stand->phase?->development?->name ?? '').' - Stand '.$stand->stand_no)
                    : $invoice->branch->name,
            ],
            'tax' => [
                'exempt' => (float) $invoice->tax_amount === 0.0 ? 'Yes' : 'No',
                'reference' => $taxCodes ?: 'ZERO',
            ],
            'lines' => $invoice->lines->map(fn ($line) => [
                'code' => $line->item?->code ?: $line->revenueAccount?->code,
                'description' => $line->description,
                'quantity' => (float) $line->quantity,
                'unit' => $line->item?->unit_of_measure ?: 'each',
                'unit_price' => (float) $line->unit_price,
                'discount_rate' => 0.0,
                'tax_rate' => (float) $line->tax_rate,
                'tax_code' => $line->tax_code,
                'net_price' => (float) $line->line_total,
            ])->all(),
            'bank' => $bank ? [
                'name' => $bank->bank_name,
                'account_name' => $bank->account_name,
                'account_number' => $bank->account_mask,
                'currency' => $bank->currency_code,
                'branch' => $bank->branch?->name,
            ] : null,
        ];
    }
}
