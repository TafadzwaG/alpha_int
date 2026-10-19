<?php

namespace App\Services;

use App\Models\Client;
use App\Models\GapRegisterEntry;
use App\Models\PaymentAllocation;
use App\Models\StandAllocation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class GapRegisterView
{
    public const TYPES = ['on_ground', 'double_allocation', 'waiting_list'];

    public const COLUMNS = [
        ['key' => 'stand_no', 'label' => 'Stand No.'],
        ['key' => 'first_name', 'label' => 'First Name'],
        ['key' => 'surname', 'label' => 'Surname'],
        ['key' => 'cooperative', 'label' => 'Co-operative'],
        ['key' => 'contacts', 'label' => 'Contacts'],
        ['key' => 'stand_size', 'label' => 'Stand Size (m²)'],
        ['key' => 'stand_price', 'label' => 'Stand Price'],
        ['key' => 'interest_amount', 'label' => 'Interest'],
        ['key' => 'amount_paid', 'label' => 'Amount Paid'],
        ['key' => 'balance', 'label' => 'Balance'],
        ['key' => 'last_payment_date', 'label' => 'Last Payment Date'],
        ['key' => 'register_comment', 'label' => 'Comment'],
        ['key' => 'captured_by', 'label' => 'By'],
    ];

    public function __construct(private readonly BranchAccessService $branchAccess) {}

    /** @return array{on_ground:int,double_allocation:int,waiting_list:int} */
    public function stats(Request $request): array
    {
        return [
            'on_ground' => $this->allocationQuery($request, 'on_ground')->count(),
            'double_allocation' => $this->allocationQuery($request, 'double_allocation')->count(),
            'waiting_list' => $this->waitingListQuery($request)->count(),
        ];
    }

    public function paginate(Request $request, string $type)
    {
        abort_unless(in_array($type, self::TYPES, true), 404);
        $filters = $this->filters($request);
        $perPage = (int) ($filters['per_page'] ?? 10);
        $page = max(1, $request->integer('page', 1));
        $rows = $this->applyAdvancedFilters($this->rows($request, $type), $filters);

        return new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );
    }

    /** @return array<string,mixed> */
    public function filters(Request $request): array
    {
        return $request->validate([
            'cooperative' => ['nullable', 'string', 'max:200'],
            'area_min' => ['nullable', 'numeric', 'min:0'],
            'area_max' => ['nullable', 'numeric', ...($request->filled('area_min') ? ['gte:area_min'] : [])],
            'balance_min' => ['nullable', 'numeric', 'min:0'],
            'balance_max' => ['nullable', 'numeric', ...($request->filled('balance_min') ? ['gte:balance_min'] : [])],
            'payment_state' => ['nullable', Rule::in(['all', 'with_payments', 'no_payments'])],
            'contact_state' => ['nullable', Rule::in(['all', 'with_contact', 'without_contact'])],
            'last_payment_from' => ['nullable', 'date_format:Y-m-d'],
            'last_payment_to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('last_payment_from') ? ['after_or_equal:last_payment_from'] : [])],
            'per_page' => ['nullable', Rule::in([10, 20, 50, 100])],
        ]);
    }

    /** @return Collection<int,array<string,mixed>> */
    public function rows(Request $request, string $type): Collection
    {
        abort_unless(in_array($type, self::TYPES, true), 404);

        if ($type === 'waiting_list') {
            return $this->waitingListQuery($request)
                ->orderByDesc('clients.id')
                ->get()
                ->map(fn (Client $client) => $this->serializeWaitingClient($client));
        }

        return $this->allocationQuery($request, $type)
            ->orderByDesc('stand_allocations.id')
            ->get()
            ->map(fn (StandAllocation $allocation) => $this->serializeAllocation($allocation, $type));
    }

    /** @param array<string,mixed> $filters @return Collection<int,array<string,mixed>> */
    private function applyAdvancedFilters(Collection $rows, array $filters): Collection
    {
        $cooperative = Str::lower(trim((string) ($filters['cooperative'] ?? '')));

        return $rows->filter(function (array $row) use ($filters, $cooperative) {
            if ($cooperative !== '' && ! Str::contains(Str::lower((string) ($row['cooperative'] ?? '')), $cooperative)) {
                return false;
            }
            foreach (['area' => 'stand_size', 'balance' => 'balance'] as $filter => $column) {
                $value = $row[$column] ?? null;
                if (filled($filters[$filter.'_min'] ?? null) && ($value === null || (float) $value < (float) $filters[$filter.'_min'])) {
                    return false;
                }
                if (filled($filters[$filter.'_max'] ?? null) && ($value === null || (float) $value > (float) $filters[$filter.'_max'])) {
                    return false;
                }
            }
            $paymentState = $filters['payment_state'] ?? 'all';
            if ($paymentState === 'with_payments' && (float) ($row['amount_paid'] ?? 0) <= 0) {
                return false;
            }
            if ($paymentState === 'no_payments' && (float) ($row['amount_paid'] ?? 0) > 0) {
                return false;
            }
            $contactState = $filters['contact_state'] ?? 'all';
            if ($contactState === 'with_contact' && blank($row['contacts'] ?? null)) {
                return false;
            }
            if ($contactState === 'without_contact' && filled($row['contacts'] ?? null)) {
                return false;
            }
            $lastPayment = $row['last_payment_date'] ?? null;
            if (filled($filters['last_payment_from'] ?? null) && (! $lastPayment || $lastPayment < $filters['last_payment_from'])) {
                return false;
            }
            if (filled($filters['last_payment_to'] ?? null) && (! $lastPayment || $lastPayment > $filters['last_payment_to'])) {
                return false;
            }

            return true;
        });
    }

    private function allocationQuery(Request $request, string $type): Builder
    {
        $query = StandAllocation::query()
            ->whereHas('clientFile.client', fn (Builder $client) => $client->where('organization_id', $request->user()->organization_id))
            ->where('status', '!=', 'cancelled')
            ->with([
                'clientFile.client:id,owning_branch_id,client_no,first_name,middle_names,last_name,phone_normalized,sms_consent,status',
                'stand:id,stand_no,area_sqm,list_price,currency_code',
                'branch:id,name',
                'creator:id,name',
                'account.charges.paymentAllocations.payment:id,status,amount,received_at',
                'gapRegisterEntries' => fn ($entries) => $entries->where('register_type', $type)->latest('id'),
            ]);

        if ($type === 'on_ground') {
            $query->where('status', 'allocated')->where(function (Builder $scope) {
                $scope->whereHas('gapRegisterEntries', fn (Builder $entry) => $entry->where('register_type', 'on_ground'))
                    ->orWhere(function (Builder $inferred) {
                        $inferred->whereDoesntHave('gapRegisterEntries')->where('category', '!=', 'special');
                    });
            });
        } else {
            $query->where(function (Builder $scope) {
                $scope->whereHas('gapRegisterEntries', fn (Builder $entry) => $entry->where('register_type', 'double_allocation'))
                    ->orWhere('category', 'special');
            });
        }

        $this->scopeBranch($query, $request, 'branch_id');
        $search = trim((string) $request->string('search'));
        if ($search !== '') {
            $query->where(function (Builder $scope) use ($search) {
                $scope->whereHas('stand', fn (Builder $stand) => $stand->where('stand_no', 'like', "%{$search}%"))
                    ->orWhereHas('clientFile.client', fn (Builder $client) => $client
                        ->where('client_no', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('phone_normalized', 'like', "%{$search}%"))
                    ->orWhereHas('gapRegisterEntries', fn (Builder $entry) => $entry
                        ->where('cooperative', 'like', "%{$search}%")
                        ->orWhere('register_comment', 'like', "%{$search}%")
                        ->orWhere('captured_by', 'like', "%{$search}%"));
            });
        }

        return $query;
    }

    private function waitingListQuery(Request $request): Builder
    {
        $query = Client::query()
            ->where('organization_id', $request->user()->organization_id)
            ->where('status', 'prospect')
            ->whereDoesntHave('files.allocations', fn (Builder $allocation) => $allocation->where('status', '!=', 'cancelled'))
            ->with([
                'owningBranch:id,name',
                'gapRegisterEntries' => fn ($entries) => $entries->where('register_type', 'waiting_list')->latest('id'),
            ]);

        $this->scopeBranch($query, $request, 'owning_branch_id');
        $search = trim((string) $request->string('search'));
        if ($search !== '') {
            $query->where(function (Builder $scope) use ($search) {
                $scope->where('client_no', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone_normalized', 'like', "%{$search}%")
                    ->orWhereHas('gapRegisterEntries', fn (Builder $entry) => $entry
                        ->where('stand_no_snapshot', 'like', "%{$search}%")
                        ->orWhere('cooperative', 'like', "%{$search}%")
                        ->orWhere('register_comment', 'like', "%{$search}%")
                        ->orWhere('captured_by', 'like', "%{$search}%"));
            });
        }

        return $query;
    }

    private function scopeBranch(Builder $query, Request $request, string $column): void
    {
        $visibleBranches = $this->branchAccess->branchIds($request->user());
        if ($visibleBranches !== null) {
            $query->whereIn($column, $visibleBranches);
        }
        if ($request->integer('branch')) {
            $query->where($column, $request->integer('branch'));
        }
    }

    /** @return array<string,mixed> */
    private function serializeAllocation(StandAllocation $allocation, string $type): array
    {
        /** @var GapRegisterEntry|null $entry */
        $entry = $allocation->gapRegisterEntries->first();
        $client = $allocation->clientFile?->client;
        $charges = $allocation->account?->charges ?? collect();
        $activeCharges = $charges->where('status', '!=', 'void');
        $chargeTotal = (float) $activeCharges->sum('amount');
        $paymentAllocations = $activeCharges->flatMap->paymentAllocations
            ->filter(fn (PaymentAllocation $paymentAllocation) => $paymentAllocation->payment?->status === 'approved');
        $paid = (float) $paymentAllocations->sum('amount');
        $lastPayment = $paymentAllocations->map->payment
            ->filter()
            ->sortByDesc(fn ($payment) => $payment->received_at?->getTimestamp() ?? 0)
            ->first();
        $price = $entry?->stand_price ?? $allocation->effective_price ?? $allocation->stand?->list_price;
        $interest = $entry?->interest_amount;
        if ($interest === null && $chargeTotal > 0 && $price !== null) {
            $interest = max(0, $chargeTotal - (float) $price);
        }

        return [
            'id' => "register-{$type}-{$allocation->id}",
            'stand_no' => $entry?->stand_no_snapshot ?: $allocation->stand?->stand_no,
            'first_name' => $entry?->first_name_snapshot ?: $client?->first_name,
            'surname' => $entry?->surname_snapshot ?: $client?->last_name,
            'cooperative' => $entry?->cooperative,
            'contacts' => $entry?->contacts ?: $client?->phone_normalized,
            'stand_size' => $entry?->stand_size ?? $allocation->stand?->area_sqm,
            'stand_price' => $price,
            'interest_amount' => $interest,
            'amount_paid' => $entry?->amount_paid ?? $paid,
            'balance' => $chargeTotal > 0 ? max(0, $chargeTotal - $paid) : $entry?->balance,
            'last_payment_date' => $lastPayment?->received_at?->toDateString() ?? $entry?->last_payment_date?->toDateString(),
            'register_comment' => $entry?->register_comment,
            'captured_by' => $entry?->captured_by ?: $allocation->creator?->name,
            'currency_code' => $entry?->currency_code ?: $allocation->currency_code,
            'client_id' => $client?->id,
            'allocation_id' => $allocation->id,
            'detail_url' => "/administration/stand-allocations/{$allocation->id}",
            'client_action' => $client ? $this->clientAction($client) : null,
            'allocation_action' => [
                'resource' => 'stand-allocations',
                'detail_url' => "/administration/stand-allocations/{$allocation->id}",
                'record' => [
                    'id' => $allocation->id,
                    'client_file_id' => $allocation->client_file_id,
                    'stand_id' => $allocation->stand_id,
                    'branch_id' => $allocation->branch_id,
                    'category' => $allocation->category,
                    'allocated_at' => $allocation->allocated_at?->toIso8601String(),
                    'effective_price' => $allocation->effective_price,
                    'currency_code' => $allocation->currency_code,
                    'status' => $allocation->status,
                ],
            ],
        ];
    }

    /** @return array<string,mixed> */
    private function serializeWaitingClient(Client $client): array
    {
        /** @var GapRegisterEntry|null $entry */
        $entry = $client->gapRegisterEntries->first();

        return [
            'id' => "register-waiting-list-{$client->id}",
            'stand_no' => $entry?->stand_no_snapshot,
            'first_name' => $entry?->first_name_snapshot ?: $client->first_name,
            'surname' => $entry?->surname_snapshot ?: $client->last_name,
            'cooperative' => $entry?->cooperative,
            'contacts' => $entry?->contacts ?: $client->phone_normalized,
            'stand_size' => $entry?->stand_size,
            'stand_price' => $entry?->stand_price,
            'interest_amount' => $entry?->interest_amount,
            'amount_paid' => $entry?->amount_paid,
            'balance' => $entry?->balance,
            'last_payment_date' => $entry?->last_payment_date?->toDateString(),
            'register_comment' => $entry?->register_comment,
            'captured_by' => $entry?->captured_by,
            'currency_code' => $entry?->currency_code,
            'client_id' => $client->id,
            'allocation_id' => null,
            'detail_url' => "/administration/clients/{$client->id}",
            'client_action' => $this->clientAction($client),
            'allocation_action' => null,
        ];
    }

    /** @return array{resource:string,detail_url:string,record:array<string,mixed>} */
    private function clientAction(Client $client): array
    {
        return [
            'resource' => 'clients',
            'detail_url' => "/administration/clients/{$client->id}",
            'record' => [
                'id' => $client->id,
                'owning_branch_id' => $client->owning_branch_id,
                'client_no' => $client->client_no,
                'first_name' => $client->first_name,
                'middle_names' => $client->middle_names,
                'last_name' => $client->last_name,
                'national_id' => null,
                'phone_normalized' => $client->phone_normalized,
                'sms_consent' => $client->sms_consent,
                'status' => $client->status,
            ],
        ];
    }
}
