<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\Branch;
use App\Models\Client;
use App\Models\ClientAccount;
use App\Models\ClientFile;
use App\Models\GapRegisterEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\Receipt;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\User;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenSpout\Common\Entity\Cell\FormulaCell;
use OpenSpout\Reader\XLSX\Reader;
use Throwable;

class GapWorkbookImporter
{
    private const MAX_ROWS_PER_SHEET = 10_000;

    private const PREVIEW_ROWS_PER_SHEET = 10;

    private const SHEETS = [
        'RECIEPTS' => 'receipts',
        'RECEIPTS' => 'receipts',
        'ON GROUND' => 'on_ground',
        'DOUBLE ALLOCATION' => 'double_allocation',
        'WAITING LIST' => 'waiting_list',
    ];

    private const REQUIRED_HEADERS = [
        'receipts' => ['date', 'stand_number', 'name', 'receipt_numbers', 'amount'],
        'on_ground' => ['stand_no', 'first_name', 'surname', 'stand_price', 'amount_paid'],
        'double_allocation' => ['stand_no', 'first_name', 'surname', 'stand_price', 'amount_paid'],
        'waiting_list' => ['stand_no', 'first_name', 'surname'],
    ];

    /**
     * @param  array{branch_id:int,phase_id:int,stand_type_id:int,currency_code:string,payment_method_id:int}  $context
     * @return array<string, mixed>
     */
    public function process(UploadedFile $file, array $context, User $user, bool $persist): array
    {
        $parsed = $this->parse($file->getRealPath());
        $issues = $this->validateRows($parsed['rows']);
        $hasErrors = collect($issues)->contains(fn (array $issue) => $issue['level'] === 'error');
        $counts = $this->plannedCounts($parsed['rows']);

        $result = [
            'mode' => $persist ? 'import' : 'validate',
            'filename' => $file->getClientOriginalName(),
            'valid' => ! $hasErrors,
            'recognized_sheets' => $parsed['recognized_sheets'],
            'ignored_sheets' => $parsed['ignored_sheets'],
            'counts' => $counts,
            'preview' => $this->previewRows($parsed['rows']),
            'issues' => array_slice([...$parsed['issues'], ...$issues], 0, 100),
        ];

        if (! $persist || $hasErrors) {
            return $result;
        }

        $result['counts'] = DB::transaction(fn () => $this->importRows($parsed['rows'], $context, $user, $result['issues']));
        $result['imported'] = true;

        return $result;
    }

    /**
     * @return array{rows:array<string,array<int,array<string,mixed>>>,recognized_sheets:array<int,string>,ignored_sheets:array<int,string>,issues:array<int,array<string,mixed>>}
     */
    private function parse(string $path): array
    {
        $reader = new Reader;
        $rows = ['receipts' => [], 'on_ground' => [], 'double_allocation' => [], 'waiting_list' => []];
        $recognizedSheets = [];
        $ignoredSheets = [];
        $issues = [];

        try {
            $reader->open($path);

            foreach ($reader->getSheetIterator() as $sheet) {
                $sheetName = Str::upper(trim($sheet->getName()));
                $type = self::SHEETS[$sheetName] ?? null;

                if (! $type) {
                    $ignoredSheets[] = $sheet->getName();

                    continue;
                }

                $recognizedSheets[] = $sheet->getName();
                $headers = null;
                $rowNumber = 0;

                foreach ($sheet->getRowIterator() as $row) {
                    $rowNumber++;
                    if ($rowNumber > self::MAX_ROWS_PER_SHEET) {
                        $issues[] = $this->issue('error', $sheet->getName(), $rowNumber, 'The sheet exceeds the 10,000-row import limit.');

                        break;
                    }

                    $values = array_map(
                        fn ($cell) => $cell instanceof FormulaCell
                            ? ($cell->getComputedValue() ?? $cell->getValue())
                            : $cell->getValue(),
                        $row->getCells(),
                    );
                    if ($headers === null) {
                        $candidate = $this->headerMap($values);
                        if ($this->hasRequiredHeaders($type, $candidate)) {
                            $headers = $candidate;
                        }

                        continue;
                    }

                    $data = $this->mapRow($headers, $values);
                    if ($this->isBusinessRowEmpty($type, $data)) {
                        continue;
                    }

                    $rows[$type][] = [
                        ...$data,
                        '_sheet' => $sheet->getName(),
                        '_row' => $rowNumber,
                    ];
                }

                if ($headers === null) {
                    $issues[] = $this->issue('error', $sheet->getName(), null, 'The expected column headings were not found. Keep the supplied template headings unchanged.');
                }
            }
        } catch (Throwable $exception) {
            $issues[] = $this->issue('error', 'Workbook', null, 'The XLSX file could not be read: '.$exception->getMessage());
        } finally {
            $reader->close();
        }

        if ($recognizedSheets === []) {
            $issues[] = $this->issue('error', 'Workbook', null, 'No supported sheets were found. Expected RECIEPTS, ON GROUND, DOUBLE ALLOCATION, or WAITING LIST.');
        }

        return [
            'rows' => $rows,
            'recognized_sheets' => $recognizedSheets,
            'ignored_sheets' => $ignoredSheets,
            'issues' => $issues,
        ];
    }

    /** @return array<string, int> */
    private function headerMap(array $values): array
    {
        $map = [];
        foreach ($values as $index => $value) {
            $header = $this->normalizeHeader($value);
            if ($header !== '') {
                $map[$header] = $index;
            }
        }

        return $map;
    }

    private function normalizeHeader(mixed $value): string
    {
        $header = Str::lower(trim((string) $value));
        $header = preg_replace('/[^a-z0-9]+/', '_', $header) ?? '';
        $header = trim($header, '_');

        return match ($header) {
            'stand_number', 'stand_no' => 'stand_no',
            'reciept_numbers', 'receipt_number', 'reciept_number' => 'receipt_numbers',
            'co_operative' => 'cooperative',
            'contacts', 'contact' => 'contacts',
            'interest' => 'interest',
            default => $header,
        };
    }

    private function hasRequiredHeaders(string $type, array $headers): bool
    {
        $available = array_keys($headers);

        return collect(self::REQUIRED_HEADERS[$type])->every(function (string $required) use ($available) {
            if ($required === 'stand_number') {
                $required = 'stand_no';
            }

            return in_array($required, $available, true);
        });
    }

    /** @return array<string, mixed> */
    private function mapRow(array $headers, array $values): array
    {
        $data = [];
        foreach ($headers as $header => $index) {
            $data[$header] = $values[$index] ?? null;
        }

        return $data;
    }

    private function isBusinessRowEmpty(string $type, array $data): bool
    {
        $keys = $type === 'receipts'
            ? ['date', 'stand_no', 'name', 'receipt_numbers', 'amount']
            : ['stand_no', 'first_name', 'surname', 'contacts', 'cooperative'];

        return collect($keys)->every(fn (string $key) => blank($data[$key] ?? null));
    }

    /** @return array<int, array<string, mixed>> */
    private function validateRows(array $rows): array
    {
        $issues = [];
        $seenOnGroundStands = [];
        $seenReceipts = [];

        foreach (['on_ground', 'double_allocation', 'waiting_list'] as $type) {
            foreach ($rows[$type] as $row) {
                $standNo = $this->text($row['stand_no'] ?? null);
                $firstName = $this->text($row['first_name'] ?? null);
                $surname = $this->text($row['surname'] ?? null);

                if ($standNo === '' && $type !== 'waiting_list') {
                    $issues[] = $this->rowIssue('error', $row, 'Stand number is required.');
                }
                if ($firstName === '' && $surname === '') {
                    $issues[] = $this->rowIssue('error', $row, 'At least a first name or surname is required.');
                }

                foreach (['stand_size', 'stand_price', 'interest', 'amount_paid', 'balance'] as $field) {
                    $raw = $row[$field] ?? null;
                    if (! blank($raw) && $this->number($raw) === null) {
                        $issues[] = $this->rowIssue('error', $row, Str::headline($field).' must be numeric.');
                    } elseif (($this->number($raw) ?? 0) < 0) {
                        $issues[] = $this->rowIssue('error', $row, Str::headline($field).' cannot be negative.');
                    }
                }

                if ($type === 'on_ground' && $standNo !== '') {
                    $key = Str::lower($standNo);
                    if (isset($seenOnGroundStands[$key])) {
                        $issues[] = $this->rowIssue('error', $row, "Stand {$standNo} appears more than once on ON GROUND (first seen on row {$seenOnGroundStands[$key]}). Use DOUBLE ALLOCATION for disputed duplicates.");
                    }
                    $seenOnGroundStands[$key] = $row['_row'];
                }

                $balance = $this->number($row['balance'] ?? null);
                $due = ($this->number($row['stand_price'] ?? null) ?? 0) + ($this->number($row['interest'] ?? null) ?? 0);
                $paid = $this->number($row['amount_paid'] ?? null) ?? 0;
                if ($balance !== null && abs($balance - max(0, $due - $paid)) > 0.02) {
                    $issues[] = $this->rowIssue('warning', $row, 'The supplied balance does not match stand price plus interest less amount paid. The system will calculate the balance from transactions.');
                }
            }
        }

        foreach ($rows['receipts'] as $row) {
            $standNo = $this->text($row['stand_no'] ?? null);
            $receiptNo = $this->text($row['receipt_numbers'] ?? null);
            $amount = $this->number($row['amount'] ?? null);

            if ($standNo === '') {
                $issues[] = $this->rowIssue('error', $row, 'Stand number is required.');
            }
            if ($receiptNo === '') {
                $issues[] = $this->rowIssue('error', $row, 'Receipt number is required.');
            }
            if ($amount === null || $amount <= 0) {
                $issues[] = $this->rowIssue('error', $row, 'Amount must be greater than zero.');
            }
            if ($this->date($row['date'] ?? null) === null) {
                $issues[] = $this->rowIssue('error', $row, 'Date must be a valid Excel date or date text.');
            }
            if ($receiptNo !== '') {
                $key = Str::lower($receiptNo);
                if (isset($seenReceipts[$key])) {
                    $issues[] = $this->rowIssue('error', $row, "Receipt {$receiptNo} is duplicated in the workbook.");
                }
                $seenReceipts[$key] = true;
            }
        }

        return $issues;
    }

    /** @return array<string, int> */
    private function plannedCounts(array $rows): array
    {
        $allocationRows = [...$rows['on_ground'], ...$rows['double_allocation']];
        $clientKeys = collect([...$allocationRows, ...$rows['waiting_list']])
            ->map(fn (array $row) => $this->clientKey($row))
            ->filter()
            ->unique();
        $hasDetailedReceipts = count($rows['receipts']) > 0;

        return [
            'rows' => collect($rows)->sum(fn (array $sheetRows) => count($sheetRows)),
            'clients' => $clientKeys->count(),
            'stands' => collect($allocationRows)->pluck('stand_no')->map(fn ($value) => Str::lower($this->text($value)))->filter()->unique()->count(),
            'allocations' => count($allocationRows),
            'charges' => count($rows['on_ground']),
            'payments' => $hasDetailedReceipts
                ? count($rows['receipts'])
                : collect($rows['on_ground'])->filter(fn (array $row) => ($this->number($row['amount_paid'] ?? null) ?? 0) > 0)->count(),
            'receipts' => $hasDetailedReceipts
                ? count($rows['receipts'])
                : collect($rows['on_ground'])->filter(fn (array $row) => ($this->number($row['amount_paid'] ?? null) ?? 0) > 0)->count(),
            'waiting_list' => count($rows['waiting_list']),
            'double_allocations' => count($rows['double_allocation']),
        ];
    }

    /** @return array<string, array<int, array<string, mixed>>> */
    private function previewRows(array $rows): array
    {
        $columns = [
            'on_ground' => ['stand_no', 'first_name', 'surname', 'contacts', 'stand_size', 'stand_price', 'interest', 'amount_paid', 'balance', 'last_payment_date'],
            'double_allocation' => ['stand_no', 'first_name', 'surname', 'contacts', 'stand_size', 'stand_price', 'amount_paid', 'comment'],
            'waiting_list' => ['stand_no', 'first_name', 'surname', 'contacts', 'cooperative', 'comment'],
            'receipts' => ['date', 'stand_no', 'name', 'receipt_numbers', 'amount'],
        ];

        return collect($columns)->mapWithKeys(function (array $fields, string $type) use ($rows) {
            $preview = collect($rows[$type] ?? [])
                ->take(self::PREVIEW_ROWS_PER_SHEET)
                ->map(function (array $row) use ($fields) {
                    $values = [
                        'sheet' => (string) ($row['_sheet'] ?? ''),
                        'row' => (int) ($row['_row'] ?? 0),
                    ];

                    foreach ($fields as $field) {
                        $value = $row[$field] ?? null;
                        $values[$field] = $value instanceof DateTimeInterface
                            ? $value->format('Y-m-d')
                            : (is_scalar($value) ? $value : null);
                    }

                    return $values;
                })
                ->values()
                ->all();

            return [$type => $preview];
        })->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $issues
     * @return array<string, int>
     */
    private function importRows(array $rows, array $context, User $user, array &$issues): array
    {
        $branch = Branch::findOrFail($context['branch_id']);
        $method = PaymentMethod::findOrFail($context['payment_method_id']);
        $counts = array_fill_keys(['rows', 'clients', 'stands', 'allocations', 'charges', 'payments', 'receipts', 'waiting_list', 'double_allocations'], 0);
        $accountsByStand = [];

        foreach ($rows['waiting_list'] as $row) {
            [$client, $created] = $this->upsertClient($row, $branch, $user, 'prospect');
            $this->upsertRegisterEntry($row, 'waiting_list', $client, null, null, $branch, $context);
            $counts['clients'] += (int) $created;
            $counts['waiting_list']++;
            $counts['rows']++;
        }

        foreach (['on_ground', 'double_allocation'] as $type) {
            foreach ($rows[$type] as $row) {
                [$client, $clientCreated] = $this->upsertClient($row, $branch, $user, 'active');
                [$stand, $standCreated] = $this->upsertStand($row, $context, $type);
                $clientFile = ClientFile::firstOrCreate(
                    ['client_id' => $client->id, 'branch_id' => $branch->id],
                    [
                        'file_no' => Str::limit("CF-{$client->client_no}", 60, ''),
                        'opened_at' => now(),
                        'lifecycle_status' => 'open',
                        'created_by' => $user->id,
                    ],
                );
                [$allocation, $allocationCreated] = $this->upsertAllocation($row, $type, $clientFile, $stand, $branch, $context, $user);
                $this->upsertRegisterEntry($row, $type, $client, $stand, $allocation, $branch, $context);

                $counts['clients'] += (int) $clientCreated;
                $counts['stands'] += (int) $standCreated;
                $counts['allocations'] += (int) $allocationCreated;
                $counts['rows']++;
                $counts[$type === 'double_allocation' ? 'double_allocations' : 'charges']++;

                if ($type === 'on_ground') {
                    [$account, $charge] = $this->upsertAccountAndCharge($row, $allocation, $clientFile, $context, $user);
                    $accountsByStand[Str::lower($stand->stand_no)] = [$account, $charge, $row];
                }
            }
        }

        if ($rows['receipts'] === []) {
            foreach ($accountsByStand as [$account, $charge, $row]) {
                $amount = $this->number($row['amount_paid'] ?? null) ?? 0;
                if ($amount <= 0) {
                    continue;
                }

                $receiptNo = 'LEGACY-'.$branch->code.'-'.Str::upper(substr(hash('sha256', $account->account_no), 0, 12));
                $receivedAt = $this->date($row['last_payment_date'] ?? null) ?? now();
                [$paymentCreated, $receiptCreated] = $this->upsertPayment($account, $charge, $branch, $method, $context['currency_code'], $amount, $receivedAt, $receiptNo, $user, $row);
                $counts['payments'] += (int) $paymentCreated;
                $counts['receipts'] += (int) $receiptCreated;
            }
        } else {
            foreach ($rows['receipts'] as $row) {
                $standKey = Str::lower($this->text($row['stand_no'] ?? null));
                [$account, $charge] = $accountsByStand[$standKey] ?? $this->findAccountByStand($standKey, $context['phase_id'], $branch->id);

                if (! $account || ! $charge) {
                    $issues[] = $this->rowIssue('warning', $row, 'No active allocation account was found for this stand, so the receipt was skipped.');

                    continue;
                }

                [$paymentCreated, $receiptCreated] = $this->upsertPayment(
                    $account,
                    $charge,
                    $branch,
                    $method,
                    $context['currency_code'],
                    $this->number($row['amount']) ?? 0,
                    $this->date($row['date']) ?? now(),
                    $this->text($row['receipt_numbers']),
                    $user,
                    $row,
                );
                $counts['payments'] += (int) $paymentCreated;
                $counts['receipts'] += (int) $receiptCreated;
                $counts['rows']++;
            }
        }

        return $counts;
    }

    private function upsertRegisterEntry(
        array $row,
        string $type,
        Client $client,
        ?Stand $stand,
        ?StandAllocation $allocation,
        Branch $branch,
        array $context,
    ): void {
        $price = $this->number($row['stand_price'] ?? null);
        $interest = $this->number($row['interest'] ?? null);
        $paid = $this->number($row['amount_paid'] ?? null);
        $balance = $this->number($row['balance'] ?? null);
        if ($balance === null && ($price !== null || $interest !== null || $paid !== null)) {
            $balance = max(0, ($price ?? 0) + ($interest ?? 0) - ($paid ?? 0));
        }

        GapRegisterEntry::updateOrCreate(
            [
                'organization_id' => $client->organization_id,
                'branch_id' => $branch->id,
                'register_type' => $type,
                'source_sheet' => $this->text($row['_sheet'] ?? Str::headline($type)),
                'source_row' => (int) ($row['_row'] ?? 0),
            ],
            [
                'client_id' => $client->id,
                'stand_id' => $stand?->id,
                'stand_allocation_id' => $allocation?->id,
                'stand_no_snapshot' => $this->text($row['stand_no'] ?? null) ?: null,
                'first_name_snapshot' => $this->text($row['first_name'] ?? null) ?: null,
                'surname_snapshot' => $this->text($row['surname'] ?? null) ?: null,
                'cooperative' => $this->text($row['cooperative'] ?? null) ?: null,
                'contacts' => $this->text($row['contacts'] ?? null) ?: null,
                'stand_size' => $this->number($row['stand_size'] ?? null),
                'stand_price' => $price,
                'interest_amount' => $interest,
                'amount_paid' => $paid,
                'balance' => $balance,
                'last_payment_date' => $this->date($row['last_payment_date'] ?? null)?->toDateString(),
                'register_comment' => $this->text($row['comment'] ?? null) ?: null,
                'captured_by' => $this->text($row['by'] ?? null) ?: null,
                'currency_code' => $context['currency_code'],
            ],
        );
    }

    /** @return array{0:Client,1:bool} */
    private function upsertClient(array $row, Branch $branch, User $user, string $status): array
    {
        $firstName = $this->text($row['first_name'] ?? null);
        $lastName = $this->text($row['surname'] ?? null);
        if ($firstName === '') {
            $firstName = $lastName;
            $lastName = 'Unknown';
        } elseif ($lastName === '') {
            $lastName = 'Unknown';
        }
        $phone = $this->normalizePhone($row['contacts'] ?? null);
        $clientNo = 'GAP-'.$branch->code.'-'.Str::upper(substr($this->clientKey($row), 0, 12));
        $client = Client::withTrashed()->firstOrNew([
            'organization_id' => $user->organization_id,
            'client_no' => $clientNo,
        ]);
        $created = ! $client->exists;
        if ($client->trashed()) {
            $client->restore();
        }
        $client->fill([
            'owning_branch_id' => $branch->id,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'search_name' => Str::lower(trim("{$lastName} {$firstName}")),
            'phone_normalized' => $phone,
            'status' => $client->exists && $client->status === 'active' ? 'active' : $status,
        ])->save();

        return [$client, $created];
    }

    /** @return array{0:Stand,1:bool} */
    private function upsertStand(array $row, array $context, string $type): array
    {
        $standNo = $this->text($row['stand_no']);
        $stand = Stand::firstOrNew(['phase_id' => $context['phase_id'], 'stand_no' => $standNo]);
        $created = ! $stand->exists;
        $currentStatus = $stand->physical_status;
        $status = $type === 'on_ground'
            ? 'allocated'
            : (in_array($currentStatus, ['allocated', 'withdrawn'], true) ? $currentStatus : 'reserved');
        $price = $this->number($row['stand_price'] ?? null);
        $area = $this->number($row['stand_size'] ?? null);
        $stand->fill([
            'stand_type_id' => $context['stand_type_id'],
            'area_sqm' => $area ?? $stand->area_sqm,
            'list_price' => $price ?? $stand->list_price ?? 0,
            'currency_code' => $context['currency_code'],
            'physical_status' => $status,
        ])->save();

        return [$stand, $created];
    }

    /** @return array{0:StandAllocation,1:bool} */
    private function upsertAllocation(array $row, string $type, ClientFile $clientFile, Stand $stand, Branch $branch, array $context, User $user): array
    {
        $allocation = StandAllocation::query()
            ->where('client_file_id', $clientFile->id)
            ->where('stand_id', $stand->id)
            ->where('branch_id', $branch->id)
            ->where('status', '!=', 'cancelled')
            ->first();
        $created = ! $allocation;
        $allocation ??= new StandAllocation;
        $price = $this->number($row['stand_price'] ?? null);
        $paid = $this->number($row['amount_paid'] ?? null) ?? 0;
        $due = ($price ?? 0) + ($this->number($row['interest'] ?? null) ?? 0);
        $allocation->fill([
            'client_file_id' => $clientFile->id,
            'stand_id' => $stand->id,
            'branch_id' => $branch->id,
            'category' => $type === 'double_allocation' ? 'special' : ($paid >= $due && $due > 0 ? 'cash' : 'credit'),
            'allocated_at' => $type === 'on_ground' ? ($allocation->allocated_at ?? now()) : $allocation->allocated_at,
            'effective_price' => $price,
            'currency_code' => $context['currency_code'],
            'status' => $type === 'on_ground' ? 'allocated' : 'pending',
            'created_by' => $allocation->created_by ?? $user->id,
            'lock_version' => $allocation->exists ? $allocation->lock_version + 1 : 0,
        ])->save();

        return [$allocation, $created];
    }

    /** @return array{0:ClientAccount,1:AccountCharge} */
    private function upsertAccountAndCharge(array $row, StandAllocation $allocation, ClientFile $clientFile, array $context, User $user): array
    {
        $account = ClientAccount::updateOrCreate(
            ['allocation_id' => $allocation->id],
            [
                'client_file_id' => $clientFile->id,
                'account_no' => Str::limit("ACC-{$clientFile->file_no}-{$allocation->id}", 60, ''),
                'currency_code' => $context['currency_code'],
                'opened_at' => $allocation->allocated_at ?? now(),
                'status' => 'open',
            ],
        );
        $amount = ($this->number($row['stand_price'] ?? null) ?? 0) + ($this->number($row['interest'] ?? null) ?? 0);
        $charge = AccountCharge::updateOrCreate(
            ['account_id' => $account->id, 'charge_type' => 'stand_price'],
            [
                'description' => 'Imported stand price'.(($this->number($row['interest'] ?? null) ?? 0) > 0 ? ' and interest' : ''),
                'amount' => $amount,
                'currency_code' => $context['currency_code'],
                'due_date' => ($this->date($row['last_payment_date'] ?? null) ?? now())->toDateString(),
                'status' => 'posted',
                'posted_at' => now(),
                'created_by' => $user->id,
            ],
        );

        return [$account, $charge];
    }

    /** @return array{0:?ClientAccount,1:?AccountCharge} */
    private function findAccountByStand(string $standNo, int $phaseId, int $branchId): array
    {
        $allocation = StandAllocation::query()
            ->where('branch_id', $branchId)
            ->where('status', 'allocated')
            ->whereHas('stand', fn ($query) => $query->where('phase_id', $phaseId)->whereRaw('LOWER(stand_no) = ?', [$standNo]))
            ->with('account.charges')
            ->first();

        return [$allocation?->account, $allocation?->account?->charges?->firstWhere('charge_type', 'stand_price')];
    }

    /** @return array{0:bool,1:bool} */
    private function upsertPayment(ClientAccount $account, AccountCharge $charge, Branch $branch, PaymentMethod $method, string $currency, float $amount, Carbon $receivedAt, string $receiptNo, User $user, array $sourceRow): array
    {
        $reference = Str::limit('GAPS-'.$receiptNo, 120, '');
        $payment = Payment::firstOrNew([
            'branch_id' => $branch->id,
            'method_id' => $method->id,
            'external_reference' => $reference,
        ]);
        $paymentCreated = ! $payment->exists;
        $payment->fill([
            'account_id' => $account->id,
            'amount' => $amount,
            'currency_code' => $currency,
            'received_at' => $receivedAt,
            'status' => 'approved',
            'made_by' => $payment->made_by ?? $user->id,
            'approved_by' => $user->id,
            'approved_at' => now(),
            'lock_version' => $payment->exists ? $payment->lock_version + 1 : 0,
        ])->save();

        $alreadyAllocated = (float) PaymentAllocation::query()
            ->where('charge_id', $charge->id)
            ->where('payment_id', '!=', $payment->id)
            ->sum('amount');
        $allocationAmount = min($amount, max(0, (float) $charge->amount - $alreadyAllocated));
        PaymentAllocation::updateOrCreate(
            ['payment_id' => $payment->id, 'charge_id' => $charge->id],
            ['amount' => $allocationAmount],
        );
        $totalAllocated = (float) PaymentAllocation::query()->where('charge_id', $charge->id)->sum('amount');
        $charge->update(['status' => $totalAllocated >= (float) $charge->amount ? 'paid' : ($totalAllocated > 0 ? 'partially_paid' : 'posted')]);

        $receipt = Receipt::firstOrNew([
            'organization_id' => $user->organization_id,
            'receipt_no' => $receiptNo,
        ]);
        $receiptCreated = ! $receipt->exists;
        $snapshot = [
            'source' => 'GAPS workbook import',
            'sheet' => $sourceRow['_sheet'],
            'row' => $sourceRow['_row'],
            'client' => trim((string) ($sourceRow['name'] ?? (($sourceRow['first_name'] ?? '').' '.($sourceRow['surname'] ?? '')))),
            'stand_no' => $sourceRow['stand_no'] ?? null,
            'amount' => $amount,
            'currency' => $currency,
            'received_at' => $receivedAt->toIso8601String(),
        ];
        $receipt->fill([
            'payment_id' => $payment->id,
            'issued_at' => $receivedAt,
            'content_hash' => hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR)),
            'qr_token_hash' => hash('sha256', "{$user->organization_id}|{$receiptNo}|{$payment->id}"),
            'snapshot_json' => $snapshot,
            'issued_by' => $user->id,
        ])->save();

        return [$paymentCreated, $receiptCreated];
    }

    private function clientKey(array $row): string
    {
        $parts = [
            Str::lower($this->text($row['first_name'] ?? null)),
            Str::lower($this->text($row['surname'] ?? null)),
            $this->normalizePhone($row['contacts'] ?? null),
            Str::lower($this->text($row['cooperative'] ?? null)),
        ];

        return hash('sha256', implode('|', $parts));
    }

    private function normalizePhone(mixed $value): ?string
    {
        $phone = $this->text($value);

        return $phone === '' ? null : preg_replace('/(?!^\+)[^0-9]/', '', $phone);
    }

    private function text(mixed $value): string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return trim((string) ($value ?? ''));
    }

    private function number(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        $text = trim((string) ($value ?? ''));
        if ($text === '' || str_starts_with($text, '=')) {
            return null;
        }
        $negative = str_starts_with($text, '(') && str_ends_with($text, ')');
        $normalized = preg_replace('/[^0-9.\-]/', '', $text) ?? '';
        if ($normalized === '' || ! is_numeric($normalized)) {
            return null;
        }

        return (float) $normalized * ($negative ? -1 : 1);
    }

    private function date(mixed $value): ?Carbon
    {
        if ($value instanceof DateTimeInterface) {
            return Carbon::instance(\DateTime::createFromInterface($value));
        }
        if (blank($value) || (is_string($value) && str_starts_with(trim($value), '='))) {
            return null;
        }
        if (is_numeric($value)) {
            return Carbon::create(1899, 12, 30)->addDays((int) $value);
        }

        try {
            return Carbon::parse((string) $value);
        } catch (Throwable) {
            return null;
        }
    }

    /** @return array{level:string,sheet:string,row:?int,message:string} */
    private function rowIssue(string $level, array $row, string $message): array
    {
        return $this->issue($level, (string) $row['_sheet'], (int) $row['_row'], $message);
    }

    /** @return array{level:string,sheet:string,row:?int,message:string} */
    private function issue(string $level, string $sheet, ?int $row, string $message): array
    {
        return compact('level', 'sheet', 'row', 'message');
    }
}
