<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Services\BranchAccessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReceiptRegisterController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'branch' => ['nullable', 'integer'],
            'method' => ['nullable', 'integer'],
            'currency' => ['nullable', 'string', 'max:3'],
            'issued_from' => ['nullable', 'date'],
            'issued_to' => ['nullable', 'date', ...($request->filled('issued_from') ? ['after_or_equal:issued_from'] : [])],
            'availability' => ['nullable', 'in:available,unavailable'],
            'sort' => ['nullable', 'in:receipt_no,issued_at'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'in:10,20,50,100'],
        ]);
        $branches = app(BranchAccessService::class)->availableBranches($request->user());
        $query = Receipt::query()->where('organization_id', $request->user()->organization_id)
            ->whereHas('payment', fn (Builder $q) => $q->whereIn('branch_id', $branches->pluck('id'))
                ->whereHas('account.clientFile.client', fn (Builder $client) => $client->where('organization_id', $request->user()->organization_id)));
        foreach (['branch' => 'branch_id', 'method' => 'method_id', 'currency' => 'currency_code'] as $filter => $column) {
            if (! empty($filters[$filter])) {
                $query->whereHas('payment', fn (Builder $q) => $q->where($column, $filters[$filter]));
            }
        }
        foreach (['issued_from' => '>=', 'issued_to' => '<='] as $key => $operator) {
            if (! empty($filters[$key])) {
                $query->whereDate('issued_at', $operator, $filters[$key]);
            }
        }
        if (! empty($filters['availability'])) {
            $query->whereHas('payment', fn (Builder $q) => $filters['availability'] === 'available' ? $q->where('status', 'approved') : $q->where('status', '!=', 'approved'));
        }
        foreach (preg_split('/\s+/', trim($filters['search'] ?? ''), -1, PREG_SPLIT_NO_EMPTY) as $word) {
            $query->where(fn (Builder $q) => $q->where('receipt_no', 'like', '%'.$word.'%')
                ->orWhere('snapshot_json', 'like', '%'.$word.'%')
                ->orWhereHas('issuer', fn (Builder $issuer) => $issuer->where('name', 'like', '%'.$word.'%')));
        }
        $stats = [
            'total' => (clone $query)->count(),
            'thisMonth' => (clone $query)->whereBetween('issued_at', [now()->startOfMonth(), now()->endOfMonth()])->count(),
            'available' => (clone $query)->whereHas('payment', fn (Builder $q) => $q->where('status', 'approved'))->count(),
            'unavailable' => (clone $query)->whereHas('payment', fn (Builder $q) => $q->where('status', '!=', 'approved'))->count(),
        ];
        $records = $query->with(['payment.account.clientFile.client', 'payment.branch', 'payment.method', 'issuer'])
            ->orderBy($filters['sort'] ?? 'issued_at', $filters['direction'] ?? 'desc')->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10)->withQueryString()->through(function (Receipt $receipt) {
                $snapshot = $receipt->snapshot_json ?? [];
                $payment = $receipt->payment;
                $client = $payment?->account?->clientFile?->client;

                return [
                    'id' => $receipt->id, 'receipt_no' => $receipt->receipt_no, 'payment_id' => $receipt->payment_id,
                    'client' => (is_string($snapshot['client'] ?? null) ? $snapshot['client'] : data_get($snapshot, 'client.name')) ?? trim($client?->first_name.' '.$client?->last_name),
                    'client_no' => data_get($snapshot, 'client.number') ?? $client?->client_no,
                    'branch' => $snapshot['branch'] ?? $payment?->branch?->name,
                    'amount' => (float) ($snapshot['amount'] ?? $payment?->amount ?? 0),
                    'currency' => $snapshot['currency'] ?? $payment?->currency_code,
                    'method' => $snapshot['method'] ?? $payment?->method?->name,
                    'issued_at' => $receipt->issued_at?->toIso8601String(), 'issuer' => $receipt->issuer?->name,
                    'available' => $payment?->status === 'approved', 'payment_status' => $payment?->status,
                ];
            });

        return Inertia::render('receipts/index', [
            'records' => $records, 'stats' => $stats, 'filters' => $filters,
            'branches' => $branches->map(fn ($b) => ['value' => (string) $b->id, 'label' => $b->name])->values(),
            'methods' => PaymentMethod::orderBy('name')->get()->map(fn ($m) => ['value' => (string) $m->id, 'label' => $m->name]),
        ]);
    }
}
