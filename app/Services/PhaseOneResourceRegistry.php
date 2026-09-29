<?php

namespace App\Services;

use App\Models\AccountCharge;
use App\Models\ApprovalRequest;
use App\Models\ApprovalStep;
use App\Models\AuditEvent;
use App\Models\BankAccount;
use App\Models\BankDeposit;
use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\ClientAccount;
use App\Models\ClientFile;
use App\Models\Currency;
use App\Models\Development;
use App\Models\DevelopmentPhase;
use App\Models\DocumentSequence;
use App\Models\ExchangeRate;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseLine;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\Permission;
use App\Models\PettyCashEntry;
use App\Models\Receipt;
use App\Models\ReconciliationRun;
use App\Models\Role;
use App\Models\Stand;
use App\Models\StandAllocation;
use App\Models\StandType;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserBranchAccess;
use App\Models\WorkflowAction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PhaseOneResourceRegistry
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function keys(): array
    {
        return array_keys($this->definitions());
    }

    public function definition(string $key): array
    {
        abort_unless(isset($this->definitions()[$key]), 404);

        return $this->definitions()[$key];
    }

    public function page(string $key, Request $request): array
    {
        $definition = $this->definition($key);
        $query = $this->query($key, $request);
        $search = trim((string) $request->string('search'));
        $status = Str::lower(trim((string) $request->string('status')));
        $branchId = $request->integer('branch');
        $statusOptions = [
            'stands' => ['planned', 'available', 'reserved', 'allocated', 'withdrawn'],
            'clients' => ['prospect', 'active', 'inactive', 'blocked'],
            'stand-allocations' => ['pending', 'approved', 'allocated', 'cancelled'],
        ];

        if (! in_array($status, $statusOptions[$key] ?? [], true)) {
            $status = '';
        }

        if ($status !== '') {
            $query->where(match ($key) {
                'stands' => 'physical_status',
                default => 'status',
            }, $status);
        }

        if ($branchId && in_array($key, ['stands', 'clients', 'stand-allocations'], true)) {
            if ($key === 'stands') {
                $query->whereHas('allocations', fn (Builder $builder) => $builder->where('branch_id', $branchId));
            } elseif ($key === 'clients') {
                $query->where('owning_branch_id', $branchId);
            } else {
                $query->where('branch_id', $branchId);
            }
        }

        if ($search !== '' && $key === 'stand-allocations') {
            $query->where(function (Builder $builder) use ($search) {
                $builder->where('category', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhereHas('stand', fn (Builder $stand) => $stand->where('stand_no', 'like', "%{$search}%"))
                    ->orWhereHas('clientFile.client', fn (Builder $client) => $client
                        ->where('client_no', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('search_name', 'like', "%{$search}%"));
            });
        } elseif ($search !== '' && $definition['searchable']) {
            $query->where(function (Builder $builder) use ($definition, $search) {
                foreach ($definition['searchable'] as $index => $column) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $builder->{$method}($column, 'like', "%{$search}%");
                }
            });
        }

        $records = $query->latest($query->getModel()->getQualifiedKeyName())
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Model $record) => $this->serialize($key, $record));

        return [
            'resource' => [
                'key' => $key,
                'detailsEnabled' => in_array($key, ['stands', 'clients', 'stand-allocations'], true),
                ...Arr::except($definition, ['model', 'searchable']),
            ],
            'records' => $records,
            'options' => $this->options($request),
            'filters' => ['search' => $search, 'status' => $status, 'branch' => $branchId ? (string) $branchId : 'all'],
        ];
    }

    public function create(string $key, Request $request): Model
    {
        $definition = $this->definition($key);
        abort_if($definition['readOnly'], 405);
        $validated = $request->validate($this->rules($key, $request));

        return DB::transaction(function () use ($key, $request, $definition, $validated) {
            $payload = $this->prepare($key, $validated, $request);
            $model = new $definition['model'];
            $model->fill($payload)->save();
            $this->afterSave($key, $model, $validated, $request);
            $this->auditLogger->record($request, "{$key}.created", $model, null, $this->auditData($model));

            return $model;
        });
    }

    public function update(string $key, string $id, Request $request): Model
    {
        $definition = $this->definition($key);
        abort_if($definition['readOnly'], 405);
        $model = $this->find($key, $id, $request);
        $validated = $request->validate($this->rules($key, $request, $model));

        return DB::transaction(function () use ($key, $request, $model, $validated) {
            $before = $this->auditData($model);
            $model->fill($this->prepare($key, $validated, $request, $model))->save();
            $this->afterSave($key, $model, $validated, $request);
            $this->auditLogger->record($request, "{$key}.updated", $model, $before, $this->auditData($model->fresh()));

            return $model;
        });
    }

    public function remove(string $key, string $id, Request $request): void
    {
        $definition = $this->definition($key);
        abort_if($definition['readOnly'], 405);
        $model = $this->find($key, $id, $request);
        abort_if($key === 'users' && $model->is($request->user()), 422, 'You cannot deactivate your own account.');

        DB::transaction(function () use ($key, $request, $model) {
            $before = $this->auditData($model);

            if ($key === 'development-phases') {
                $model->forceFill(['survey_status' => 'archived'])->save();
                $event = 'archived';
            } elseif ($key === 'stands') {
                $model->forceFill(['physical_status' => 'withdrawn'])->save();
                $event = 'withdrawn';
            } elseif ($key === 'stand-allocations') {
                $model->forceFill(['status' => 'cancelled'])->save();
                $event = 'cancelled';
            } elseif ($key === 'account-charges') {
                $model->forceFill(['status' => 'void'])->save();
                $event = 'voided';
            } elseif ($key === 'payments') {
                $model->forceFill(['status' => 'reversed'])->save();
                $event = 'reversed';
            } elseif (in_array($key, ['cash-sessions', 'bank-deposits', 'reconciliation-runs'], true)) {
                $model->forceFill(['status' => 'void'])->save();
                $event = 'voided';
            } elseif ($key === 'expenses') {
                $model->forceFill(['status' => 'cancelled'])->save();
                $event = 'cancelled';
            } elseif ($model->isFillable('active')) {
                $model->forceFill(['active' => false])->save();
                $event = 'deactivated';
            } elseif ($model->isFillable('status')) {
                $model->forceFill(['status' => 'inactive'])->save();
                $event = 'deactivated';
            } else {
                $model->delete();
                $event = 'deleted';
            }

            if ($key === 'stand-allocations') {
                if ($model->stand_id) {
                    Stand::whereKey($model->stand_id)->update(['physical_status' => 'available']);
                }
                ClientAccount::where('allocation_id', $model->id)->update(['status' => 'closed', 'closed_at' => now()]);
            }
            if ($key === 'payments' && $model->cash_session_id) {
                $this->refreshCashSession($model->cash_session_id);
            }
            if ($key === 'payment-allocations') {
                $this->refreshChargeStatus($model->charge_id);
            }

            $this->auditLogger->record($request, "{$key}.{$event}", $model, $before, $model->exists ? $this->auditData($model) : null);
        });
    }

    private function query(string $key, Request $request): Builder
    {
        $definition = $this->definition($key);
        /** @var Builder $query */
        $query = $definition['model']::query();
        $organizationId = $request->user()->organization_id;

        if ($key === 'organizations') {
            $query->whereKey($organizationId);
        } elseif ($key === 'development-phases') {
            $query->whereHas('development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with('development:id,name');
        } elseif ($key === 'stands') {
            $query->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['phase.development:id,name', 'standType:id,name']);
        } elseif ($key === 'stand-allocations') {
            $query->whereHas('clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with([
                    'clientFile.client:id,client_no,first_name,last_name',
                    'stand.phase.development:id,name',
                    'branch:id,name',
                    'account.charges.paymentAllocations.payment:id,status',
                    'installments.paymentAllocations.payment:id,status',
                ]);
        } elseif ($key === 'clients') {
            $query->where('organization_id', $organizationId)->with('owningBranch:id,name');
        } elseif ($key === 'account-charges') {
            $query->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['account.clientFile.client:id,client_no,first_name,last_name']);
        } elseif ($key === 'payments') {
            $query->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['account.clientFile.client:id,client_no,first_name,last_name', 'branch:id,name', 'method:id,name', 'cashSession:id']);
        } elseif ($key === 'payment-allocations') {
            $query->whereHas('payment.account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['payment.account.clientFile.client:id,client_no,first_name,last_name', 'charge:id,charge_type,description']);
        } elseif ($key === 'receipts') {
            $query->where('organization_id', $organizationId)
                ->with(['payment.account.clientFile.client:id,client_no,first_name,last_name', 'issuer:id,name']);
        } elseif ($key === 'cash-sessions') {
            $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['branch:id,name', 'cashier:id,name']);
        } elseif ($key === 'bank-deposits') {
            $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['branch:id,name', 'bankAccount:id,bank_name,account_mask']);
        } elseif ($key === 'reconciliation-runs') {
            $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['branch:id,name', 'preparedBy:id,name']);
        } elseif ($key === 'expenses') {
            $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['branch:id,name', 'maker:id,name', 'approver:id,name', 'lines.category:id,name']);
        } elseif ($key === 'petty-cash-entries') {
            $query->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->with(['branch:id,name', 'cashSession:id', 'expense:id,expense_no,payee', 'poster:id,name']);
        } elseif ($definition['scope'] === 'organization') {
            $query->where('organization_id', $organizationId);
        } elseif ($key === 'users') {
            $query->where('organization_id', $organizationId)->with(['roles', 'branchAccess']);
        } elseif ($key === 'roles') {
            $query->where('organization_id', $organizationId)->with('permissions');
        } elseif ($key === 'audit-events') {
            $query->where('organization_id', $organizationId)->with('actor:id,name');
        }

        if (! $request->user()->can('phase-one.manage')) {
            $branchIds = UserBranchAccess::query()
                ->where('user_id', $request->user()->id)
                ->where('active', true)
                ->where(fn (Builder $builder) => $builder->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
                ->where(fn (Builder $builder) => $builder->whereNull('valid_to')->orWhere('valid_to', '>=', now()))
                ->pluck('branch_id');

            if ($key === 'branches') {
                $query->whereKey($branchIds);
            } elseif ($key === 'users') {
                $query->whereIn('home_branch_id', $branchIds);
            } elseif ($key === 'clients') {
                $query->whereIn('owning_branch_id', $branchIds);
            } elseif ($key === 'stand-allocations') {
                $query->whereIn('branch_id', $branchIds);
            } elseif (in_array($key, ['payments', 'cash-sessions', 'bank-deposits', 'reconciliation-runs', 'expenses', 'petty-cash-entries'], true)) {
                $query->whereIn('branch_id', $branchIds);
            } elseif ($key === 'account-charges') {
                $query->whereHas('account.clientFile', fn (Builder $builder) => $builder->whereIn('branch_id', $branchIds));
            } elseif ($key === 'payment-allocations') {
                $query->whereHas('payment', fn (Builder $builder) => $builder->whereIn('branch_id', $branchIds));
            } elseif ($key === 'receipts') {
                $query->whereHas('payment', fn (Builder $builder) => $builder->whereIn('branch_id', $branchIds));
            } elseif (in_array($key, ['bank-accounts', 'system-settings', 'document-sequences'], true)) {
                $query->where(fn (Builder $builder) => $builder->whereNull('branch_id')->orWhereIn('branch_id', $branchIds));
            }
        }

        return $query;
    }

    private function find(string $key, string $id, Request $request): Model
    {
        return $this->query($key, $request)->findOrFail($id);
    }

    private function rules(string $key, Request $request, ?Model $model = null): array
    {
        $organizationId = $request->user()->organization_id;
        $id = $model?->getKey();
        $branchRule = Rule::exists('branches', 'id')->where('organization_id', $organizationId);
        $developmentRule = Rule::exists('developments', 'id')->where('organization_id', $organizationId);
        $phaseIds = DevelopmentPhase::query()
            ->whereHas('development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');
        $standIds = Stand::query()
            ->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');
        $clientFileIds = ClientFile::query()
            ->whereHas('client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');
        $clientAccountIds = ClientAccount::query()
            ->whereHas('clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');
        $paymentIds = Payment::query()
            ->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');
        $chargeIds = AccountCharge::query()
            ->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');
        $cashSessionIds = CashSession::query()
            ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');
        $bankAccountIds = BankAccount::query()->where('organization_id', $organizationId)->pluck('id');
        $userIds = User::query()->where('organization_id', $organizationId)->pluck('id');
        $expenseCategoryIds = ExpenseCategory::query()->where('organization_id', $organizationId)->pluck('id');
        $expenseIds = Expense::query()
            ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
            ->pluck('id');

        return match ($key) {
            'organizations' => [
                'code' => ['required', 'string', 'max:32', Rule::unique('organizations', 'code')->ignore($id)],
                'legal_name' => ['required', 'string', 'max:255'],
                'trading_name' => ['nullable', 'string', 'max:255'],
                'registration_no' => ['nullable', 'string', 'max:80'],
                'base_currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'timezone' => ['required', 'timezone:all'],
                'status' => ['required', Rule::in(['active', 'inactive'])],
            ],
            'branches' => [
                'code' => ['required', 'string', 'max:32', Rule::unique('branches', 'code')->where('organization_id', $organizationId)->ignore($id)],
                'name' => ['required', 'string', 'max:255'],
                'timezone' => ['required', 'timezone:all'],
                'address' => ['nullable', 'string'],
                'phone' => ['nullable', 'string', 'max:40'],
                'email' => ['nullable', 'email', 'max:255'],
                'status' => ['required', Rule::in(['active', 'inactive'])],
            ],
            'users' => [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
                'password' => [$model ? 'nullable' : 'required', 'string', 'min:8'],
                'home_branch_id' => ['nullable', $branchRule],
                'role_ids' => ['array'],
                'role_ids.*' => [Rule::exists('roles', 'id')->where('organization_id', $organizationId)],
                'branch_ids' => ['array'],
                'branch_ids.*' => [$branchRule],
                'mfa_state' => ['required', Rule::in(['disabled', 'required', 'enabled'])],
                'status' => ['required', Rule::in(['active', 'suspended', 'inactive'])],
            ],
            'roles' => [
                'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->where('organization_id', $organizationId)->where('guard_name', 'web')->ignore($id)],
                'code' => ['required', 'string', 'max:80', Rule::unique('roles', 'code')->where('organization_id', $organizationId)->ignore($id)],
                'description' => ['nullable', 'string'],
                'scope_type' => ['required', Rule::in(['organization', 'branch'])],
                'permission_ids' => ['array'],
                'permission_ids.*' => ['exists:permissions,id'],
                'active' => ['required', 'boolean'],
            ],
            'permissions' => [
                'name' => ['required', 'string', 'max:255', Rule::unique('permissions', 'name')->where('guard_name', 'web')->ignore($id)],
                'code' => ['required', 'string', 'max:255', Rule::unique('permissions', 'code')->ignore($id)],
                'description' => ['nullable', 'string'],
                'risk_level' => ['required', Rule::in(['standard', 'sensitive', 'critical'])],
                'active' => ['required', 'boolean'],
            ],
            'currencies' => [
                'code' => ['required', 'string', 'size:3', Rule::unique('currencies', 'code')->ignore($id, 'code')],
                'name' => ['required', 'string', 'max:120'],
                'symbol' => ['nullable', 'string', 'max:12'],
                'decimal_places' => ['required', 'integer', 'between:0,8'],
                'active' => ['required', 'boolean'],
            ],
            'exchange-rates' => [
                'rate_date' => ['required', 'date'],
                'base_currency' => ['required', 'string', 'size:3', 'different:quote_currency', 'exists:currencies,code'],
                'quote_currency' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'rate' => ['required', 'numeric', 'gt:0'],
                'source' => ['required', 'string', 'max:120'],
            ],
            'payment-methods' => [
                'code' => ['required', 'string', 'max:40', Rule::unique('payment_methods', 'code')->ignore($id)],
                'name' => ['required', 'string', 'max:255'],
                'requires_reference' => ['required', 'boolean'],
                'cash_equivalent' => ['required', 'boolean'],
                'active' => ['required', 'boolean'],
            ],
            'bank-accounts' => [
                'branch_id' => ['nullable', $branchRule],
                'bank_name' => ['required', 'string', 'max:255'],
                'account_name' => ['required', 'string', 'max:255'],
                'account_mask' => ['required', 'string', 'max:80', Rule::unique('bank_accounts', 'account_mask')->where('organization_id', $organizationId)->ignore($id)],
                'account_reference' => ['nullable', 'string', 'max:255'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'active' => ['required', 'boolean'],
            ],
            'stand-types' => [
                'code' => ['required', 'string', 'max:40', Rule::unique('stand_types', 'code')->where('organization_id', $organizationId)->ignore($id)],
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'active' => ['required', 'boolean'],
            ],
            'developments' => [
                'code' => ['required', 'string', 'max:40', Rule::unique('developments', 'code')->where('organization_id', $organizationId)->ignore($id)],
                'name' => ['required', 'string', 'max:255'],
                'location' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'status' => ['required', Rule::in(['planning', 'active', 'on_hold', 'completed', 'inactive'])],
            ],
            'development-phases' => [
                'development_id' => ['required', $developmentRule],
                'code' => ['required', 'string', 'max:40', Rule::unique('development_phases', 'code')->where('development_id', $request->integer('development_id'))->ignore($id)],
                'name' => ['required', 'string', 'max:255'],
                'survey_status' => ['required', Rule::in(['pending', 'in_progress', 'approved', 'archived'])],
                'planned_completion_date' => ['nullable', 'date'],
            ],
            'stands' => [
                'phase_id' => ['required', Rule::exists('development_phases', 'id')->whereIn('id', $phaseIds)],
                'stand_type_id' => ['required', Rule::exists('stand_types', 'id')->where('organization_id', $organizationId)],
                'stand_no' => ['required', 'string', 'max:60', Rule::unique('stands', 'stand_no')->where('phase_id', $request->integer('phase_id'))->ignore($id)],
                'area_sqm' => ['nullable', 'numeric', 'gt:0'],
                'list_price' => ['required', 'numeric', 'min:0'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'physical_status' => ['required', Rule::in(['planned', 'available', 'reserved', 'allocated', 'withdrawn'])],
                'survey_reference' => ['nullable', 'string', 'max:255'],
                'geo_json' => ['nullable', 'json'],
            ],
            'clients' => [
                'owning_branch_id' => ['required', $branchRule],
                'client_no' => ['required', 'string', 'max:50', Rule::unique('clients', 'client_no')->where('organization_id', $organizationId)->ignore($id)],
                'first_name' => ['required', 'string', 'max:255'],
                'middle_names' => ['nullable', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'national_id' => ['nullable', 'string', 'max:120'],
                'phone_normalized' => ['nullable', 'string', 'max:30'],
                'status' => ['required', Rule::in(['prospect', 'active', 'inactive', 'blocked'])],
            ],
            'stand-allocations' => [
                'client_file_id' => ['required', Rule::exists('client_files', 'id')->whereIn('id', $clientFileIds)],
                'stand_id' => ['nullable', Rule::exists('stands', 'id')->whereIn('id', $standIds)],
                'branch_id' => ['required', $branchRule],
                'category' => ['required', Rule::in(['cash', 'credit', 'special', 'staff'])],
                'allocated_at' => ['nullable', 'date'],
                'effective_price' => ['nullable', 'numeric', 'min:0'],
                'currency_code' => ['nullable', 'string', 'size:3', 'exists:currencies,code'],
                'status' => ['required', Rule::in(['pending', 'approved', 'allocated', 'cancelled'])],
            ],
            'account-charges' => [
                'account_id' => ['required', Rule::exists('client_accounts', 'id')->whereIn('id', $clientAccountIds)],
                'charge_type' => ['required', Rule::in(['stand_price', 'administration', 'penalty', 'service', 'adjustment'])],
                'description' => ['nullable', 'string', 'max:1000'],
                'amount' => ['required', 'numeric', 'gt:0'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'due_date' => ['nullable', 'date'],
                'status' => ['required', Rule::in(['draft', 'posted', 'partially_paid', 'paid', 'void'])],
            ],
            'payments' => [
                'account_id' => ['required', Rule::exists('client_accounts', 'id')->whereIn('id', $clientAccountIds)],
                'branch_id' => ['required', $branchRule],
                'cash_session_id' => ['nullable', Rule::exists('cash_sessions', 'id')->whereIn('id', $cashSessionIds)],
                'amount' => ['required', 'numeric', 'gt:0'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'method_id' => ['required', Rule::exists('payment_methods', 'id')->where('active', true)],
                'external_reference' => ['nullable', 'string', 'max:120', Rule::unique('payments', 'external_reference')->where('branch_id', $request->integer('branch_id'))->where('method_id', $request->integer('method_id'))->ignore($id)],
                'received_at' => ['nullable', 'date'],
                'status' => ['required', Rule::in(['draft', 'pending', 'approved', 'reversed'])],
            ],
            'payment-allocations' => [
                'payment_id' => ['required', Rule::exists('payments', 'id')->whereIn('id', $paymentIds)],
                'charge_id' => ['required', Rule::exists('account_charges', 'id')->whereIn('id', $chargeIds), Rule::unique('payment_allocations', 'charge_id')->where('payment_id', $request->integer('payment_id'))->ignore($id)],
                'amount' => ['required', 'numeric', 'gt:0'],
            ],
            'cash-sessions' => [
                'branch_id' => ['required', $branchRule],
                'cashier_id' => ['required', Rule::exists('users', 'id')->whereIn('id', $userIds)],
                'opened_at' => ['nullable', 'date'],
                'closed_at' => ['nullable', 'date', 'after_or_equal:opened_at'],
                'opening_float' => ['required', 'numeric', 'min:0'],
                'expected_cash' => ['required', 'numeric', 'min:0'],
                'declared_cash' => ['nullable', 'numeric', 'min:0'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'status' => ['required', Rule::in(['open', 'closing', 'closed', 'void'])],
            ],
            'bank-deposits' => [
                'branch_id' => ['required', $branchRule],
                'bank_account_id' => ['required', Rule::exists('bank_accounts', 'id')->whereIn('id', $bankAccountIds)],
                'deposit_date' => ['required', 'date'],
                'amount' => ['required', 'numeric', 'gt:0'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'reference' => ['required', 'string', 'max:120', Rule::unique('bank_deposits', 'reference')->where('bank_account_id', $request->integer('bank_account_id'))->ignore($id)],
                'status' => ['required', Rule::in(['draft', 'submitted', 'approved', 'cleared', 'void'])],
            ],
            'reconciliation-runs' => [
                'branch_id' => ['required', $branchRule],
                'business_date' => ['required', 'date'],
                'run_no' => ['required', 'integer', 'min:1', Rule::unique('reconciliation_runs', 'run_no')->where('branch_id', $request->integer('branch_id'))->where('business_date', $request->input('business_date'))->where('currency_code', Str::upper((string) $request->input('currency_code')))->ignore($id)],
                'expected_total' => ['required', 'numeric', 'min:0'],
                'declared_total' => ['required', 'numeric', 'min:0'],
                'deposited_total' => ['required', 'numeric', 'min:0'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'status' => ['required', Rule::in(['draft', 'submitted', 'approved', 'rejected', 'void'])],
            ],
            'expenses' => [
                'branch_id' => ['required', $branchRule],
                'category_id' => ['required', Rule::exists('expense_categories', 'id')->whereIn('id', $expenseCategoryIds)],
                'expense_no' => ['nullable', 'string', 'max:80', Rule::unique('expenses', 'expense_no')->where('branch_id', $request->integer('branch_id'))->ignore($id)],
                'payee' => ['required', 'string', 'max:255'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'total_amount' => ['required', 'numeric', 'gt:0'],
                'purpose' => ['required', 'string', 'max:2000'],
                'incurred_at' => ['nullable', 'date'],
                'status' => ['required', Rule::in(['draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled'])],
            ],
            'petty-cash-entries' => [
                'branch_id' => ['required', $branchRule],
                'cash_session_id' => ['nullable', Rule::exists('cash_sessions', 'id')->whereIn('id', $cashSessionIds)],
                'expense_id' => ['nullable', Rule::exists('expenses', 'id')->whereIn('id', $expenseIds)],
                'entry_type' => ['required', Rule::in(['replenishment', 'disbursement', 'refund', 'adjustment'])],
                'amount' => ['required', 'numeric', 'gt:0'],
                'currency_code' => ['required', 'string', 'size:3', 'exists:currencies,code'],
                'posted_at' => ['nullable', 'date'],
            ],
            'expense-categories' => [
                'code' => ['required', 'string', 'max:40', Rule::unique('expense_categories', 'code')->where('organization_id', $organizationId)->ignore($id)],
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'approval_threshold' => ['nullable', 'numeric', 'min:0'],
                'policy_currency' => ['nullable', 'string', 'size:3', 'exists:currencies,code'],
                'effective_from' => ['nullable', 'date'],
                'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
                'active' => ['required', 'boolean'],
            ],
            'system-settings' => [
                'branch_id' => ['nullable', $branchRule],
                'setting_key' => ['required', 'string', 'max:150'],
                'value_json' => ['required', 'json'],
                'data_type' => ['required', Rule::in(['json', 'string', 'number', 'boolean'])],
                'effective_from' => ['required', 'date'],
                'effective_to' => ['nullable', 'date', 'after:effective_from'],
            ],
            'document-sequences' => [
                'branch_id' => ['nullable', $branchRule],
                'document_type' => ['required', 'string', 'max:40'],
                'period_key' => ['required', 'string', 'max:20'],
                'prefix' => ['nullable', 'string', 'max:30'],
                'next_value' => ['required', 'integer', 'min:1'],
                'padding' => ['required', 'integer', 'between:1,12'],
            ],
            default => [],
        };
    }

    private function prepare(string $key, array $validated, Request $request, ?Model $model = null): array
    {
        if ($this->definition($key)['scope'] === 'organization' || in_array($key, ['users', 'roles'], true)) {
            $validated['organization_id'] = $request->user()->organization_id;
        }

        foreach (['code', 'base_currency_code', 'currency_code', 'base_currency', 'quote_currency', 'policy_currency', 'document_type'] as $field) {
            if (! empty($validated[$field])) {
                $validated[$field] = Str::upper($validated[$field]);
            }
        }

        if ($key === 'users') {
            if (empty($validated['password'])) {
                unset($validated['password']);
            }
            $validated = Arr::except($validated, ['role_ids', 'branch_ids']);
        }

        if ($key === 'roles') {
            $validated['guard_name'] = 'web';
            $validated = Arr::except($validated, ['permission_ids']);
        }

        if ($key === 'permissions') {
            $validated['guard_name'] = 'web';
        }

        if ($key === 'exchange-rates') {
            $validated['approved_by'] = $request->user()->id;
            $validated['approved_at'] = now();
        }

        if ($key === 'system-settings') {
            $validated['value_json'] = json_decode($validated['value_json'], true, 512, JSON_THROW_ON_ERROR);
            $validated['created_by'] = $request->user()->id;
        }

        if ($key === 'bank-accounts') {
            if (! empty($validated['account_reference'])) {
                $validated['account_reference_encrypted'] = Crypt::encryptString($validated['account_reference']);
            }
            unset($validated['account_reference']);
        }

        if ($key === 'stands') {
            $validated['geo_json'] = ! empty($validated['geo_json'])
                ? json_decode($validated['geo_json'], true, 512, JSON_THROW_ON_ERROR)
                : null;
        }

        if ($key === 'clients') {
            $validated['search_name'] = Str::lower(trim(implode(' ', array_filter([
                $validated['last_name'],
                $validated['first_name'],
                $validated['middle_names'] ?? null,
            ]))));
            $validated['phone_normalized'] = ! empty($validated['phone_normalized'])
                ? preg_replace('/(?!^\+)[^0-9]/', '', $validated['phone_normalized'])
                : null;

            if (! empty($validated['national_id'])) {
                $normalizedNationalId = Str::upper(preg_replace('/\s+/', '', $validated['national_id']));
                $validated['national_id_hash'] = hash('sha256', $normalizedNationalId);
                $validated['national_id_encrypted'] = Crypt::encryptString($validated['national_id']);
            }
            unset($validated['national_id']);
        }

        if ($key === 'stand-allocations') {
            $validated['created_by'] = $model?->created_by ?? $request->user()->id;
            $validated['lock_version'] = $model ? $model->lock_version + 1 : 0;
            if ($validated['status'] === 'allocated' && empty($validated['allocated_at'])) {
                $validated['allocated_at'] = now();
            }
        }

        if ($key === 'account-charges') {
            $account = ClientAccount::findOrFail($validated['account_id']);
            if ($account->currency_code !== $validated['currency_code']) {
                throw ValidationException::withMessages(['currency_code' => 'The charge currency must match the client account currency.']);
            }
            $validated['created_by'] = $model?->created_by ?? $request->user()->id;
            $validated['lock_version'] = $model ? $model->lock_version + 1 : 0;
            $validated['posted_at'] = in_array($validated['status'], ['posted', 'partially_paid', 'paid'], true)
                ? ($model?->posted_at ?? now())
                : null;
        }

        if ($key === 'payments') {
            $account = ClientAccount::query()->with('clientFile')->findOrFail($validated['account_id']);
            $method = PaymentMethod::findOrFail($validated['method_id']);
            if ($account->currency_code !== $validated['currency_code']) {
                throw ValidationException::withMessages(['currency_code' => 'The payment currency must match the client account currency.']);
            }
            if ((int) $account->clientFile->branch_id !== (int) $validated['branch_id']) {
                throw ValidationException::withMessages(['branch_id' => 'The payment branch must match the client file branch.']);
            }
            if ($method->requires_reference && empty($validated['external_reference'])) {
                throw ValidationException::withMessages(['external_reference' => 'A reference is required for this payment method.']);
            }
            if ($method->cash_equivalent && empty($validated['cash_session_id'])) {
                throw ValidationException::withMessages(['cash_session_id' => 'Select an open cash session for cash-equivalent payments.']);
            }
            if (! empty($validated['cash_session_id'])) {
                $session = CashSession::findOrFail($validated['cash_session_id']);
                if ((int) $session->branch_id !== (int) $validated['branch_id'] || $session->currency_code !== $validated['currency_code'] || $session->status !== 'open') {
                    throw ValidationException::withMessages(['cash_session_id' => 'The cash session must be open and match the payment branch and currency.']);
                }
            }
            $validated['received_at'] = $validated['received_at'] ?? now();
            $validated['made_by'] = $model?->made_by ?? $request->user()->id;
            $validated['lock_version'] = $model ? $model->lock_version + 1 : 0;
            if ($validated['status'] === 'approved') {
                $validated['approved_by'] = $request->user()->id;
                $validated['approved_at'] = $model?->approved_at ?? now();
            } else {
                $validated['approved_by'] = null;
                $validated['approved_at'] = null;
            }
        }

        if ($key === 'payment-allocations') {
            $payment = Payment::findOrFail($validated['payment_id']);
            $charge = AccountCharge::findOrFail($validated['charge_id']);
            if ((int) $payment->account_id !== (int) $charge->account_id) {
                throw ValidationException::withMessages(['charge_id' => 'The payment and charge must belong to the same client account.']);
            }
            if ($payment->currency_code !== $charge->currency_code) {
                throw ValidationException::withMessages(['charge_id' => 'The payment and charge currencies must match.']);
            }
            if ($payment->status === 'reversed' || $charge->status === 'void') {
                throw ValidationException::withMessages(['amount' => 'Reversed payments and void charges cannot be allocated.']);
            }

            $paymentAllocated = PaymentAllocation::query()
                ->where('payment_id', $payment->id)
                ->when($model, fn (Builder $builder) => $builder->where('id', '!=', $model->getKey()))
                ->sum('amount');
            $chargeAllocated = PaymentAllocation::query()
                ->where('charge_id', $charge->id)
                ->when($model, fn (Builder $builder) => $builder->where('id', '!=', $model->getKey()))
                ->sum('amount');

            if ((float) $paymentAllocated + (float) $validated['amount'] > (float) $payment->amount) {
                throw ValidationException::withMessages(['amount' => 'The allocation exceeds the unallocated payment balance.']);
            }
            if ((float) $chargeAllocated + (float) $validated['amount'] > (float) $charge->amount) {
                throw ValidationException::withMessages(['amount' => 'The allocation exceeds the outstanding charge balance.']);
            }
        }

        if ($key === 'cash-sessions') {
            $validated['opened_at'] = $validated['opened_at'] ?? $model?->opened_at ?? now();
            if ($validated['status'] === 'closed') {
                $validated['closed_at'] = $validated['closed_at'] ?? now();
                $validated['closed_by'] = $request->user()->id;
            } else {
                $validated['closed_at'] = null;
                $validated['closed_by'] = null;
            }
        }

        if ($key === 'bank-deposits') {
            $bankAccount = BankAccount::findOrFail($validated['bank_account_id']);
            if ($bankAccount->currency_code !== $validated['currency_code']) {
                throw ValidationException::withMessages(['currency_code' => 'The deposit currency must match the bank account currency.']);
            }
            if ($bankAccount->branch_id && (int) $bankAccount->branch_id !== (int) $validated['branch_id']) {
                throw ValidationException::withMessages(['bank_account_id' => 'The bank account does not belong to the selected branch.']);
            }
            $validated['deposited_by'] = $model?->deposited_by ?? $request->user()->id;
            if (in_array($validated['status'], ['approved', 'cleared'], true)) {
                $validated['approved_by'] = $request->user()->id;
            }
            $validated['cleared_at'] = $validated['status'] === 'cleared' ? ($model?->cleared_at ?? now()) : null;
        }

        if ($key === 'reconciliation-runs') {
            $validated['variance'] = (float) $validated['declared_total'] - (float) $validated['expected_total'];
            $validated['prepared_by'] = $model?->prepared_by ?? $request->user()->id;
            $validated['approved_by'] = $validated['status'] === 'approved' ? $request->user()->id : null;
            $validated['lock_version'] = $model ? $model->lock_version + 1 : 0;
        }

        if ($key === 'expenses') {
            if (empty($validated['expense_no'])) {
                $sequence = Expense::query()->where('branch_id', $validated['branch_id'])->count() + 1;
                do {
                    $expenseNo = 'EXP-'.now()->format('Y').'-'.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
                    $sequence++;
                } while (Expense::query()->where('branch_id', $validated['branch_id'])->where('expense_no', $expenseNo)->exists());
                $validated['expense_no'] = $expenseNo;
            }
            $validated['incurred_at'] = $validated['incurred_at'] ?? now();
            $validated['made_by'] = $model?->made_by ?? $request->user()->id;
            $validated['lock_version'] = $model ? $model->lock_version + 1 : 0;
            unset($validated['category_id']);
        }

        if ($key === 'petty-cash-entries') {
            if (! empty($validated['cash_session_id'])) {
                $session = CashSession::findOrFail($validated['cash_session_id']);
                if ((int) $session->branch_id !== (int) $validated['branch_id'] || $session->currency_code !== $validated['currency_code']) {
                    throw ValidationException::withMessages(['cash_session_id' => 'The cash session must match the selected branch and currency.']);
                }
            }
            if (! empty($validated['expense_id'])) {
                $expense = Expense::findOrFail($validated['expense_id']);
                if ((int) $expense->branch_id !== (int) $validated['branch_id'] || $expense->currency_code !== $validated['currency_code']) {
                    throw ValidationException::withMessages(['expense_id' => 'The expense must match the selected branch and currency.']);
                }
                if ($validated['entry_type'] === 'disbursement' && ! in_array($expense->status, ['approved', 'paid'], true)) {
                    throw ValidationException::withMessages(['expense_id' => 'Only approved expenses can be paid from petty cash.']);
                }
            }
            $validated['posted_at'] = $validated['posted_at'] ?? now();
            $validated['posted_by'] = $model?->posted_by ?? $request->user()->id;
        }

        return $validated;
    }

    private function afterSave(string $key, Model $model, array $validated, Request $request): void
    {
        if ($key === 'users') {
            /** @var User $model */
            $roles = Role::query()
                ->where('organization_id', $request->user()->organization_id)
                ->whereIn('id', $validated['role_ids'] ?? [])
                ->get();
            $model->syncRoles($roles);

            $branchIds = collect($validated['branch_ids'] ?? [])->map(fn ($id) => (int) $id)->all();
            UserBranchAccess::query()->where('user_id', $model->id)->whereNotIn('branch_id', $branchIds)->update(['active' => false]);
            foreach ($branchIds as $branchId) {
                UserBranchAccess::updateOrCreate(
                    ['user_id' => $model->id, 'branch_id' => $branchId],
                    ['access_level' => 'operational', 'active' => true],
                );
            }
        }

        if ($key === 'roles') {
            /** @var Role $model */
            $permissions = Permission::query()->whereIn('id', $validated['permission_ids'] ?? [])->get();
            $model->syncPermissions($permissions);
        }

        if ($key === 'clients') {
            /** @var Client $model */
            ClientFile::firstOrCreate(
                ['client_id' => $model->id, 'branch_id' => $model->owning_branch_id],
                [
                    'file_no' => "CF-{$model->client_no}",
                    'opened_at' => now(),
                    'lifecycle_status' => 'open',
                    'created_by' => $request->user()->id,
                ],
            );
        }

        if ($key === 'stand-allocations') {
            /** @var StandAllocation $model */
            $clientFile = ClientFile::query()->with('client')->findOrFail($model->client_file_id);
            if ($model->status !== 'cancelled') {
                $account = ClientAccount::updateOrCreate(
                    ['allocation_id' => $model->id],
                    [
                        'client_file_id' => $model->client_file_id,
                        'account_no' => Str::limit("ACC-{$clientFile->file_no}-{$model->id}", 60, ''),
                        'currency_code' => $model->currency_code ?: Organization::findOrFail($request->user()->organization_id)->base_currency_code,
                        'opened_at' => now(),
                        'status' => 'open',
                    ],
                );

                if ((float) $model->effective_price > 0) {
                    AccountCharge::firstOrCreate(
                        ['account_id' => $account->id, 'charge_type' => 'stand_price'],
                        [
                            'description' => 'Stand '.($model->stand?->stand_no ?? 'allocation').' purchase price',
                            'amount' => $model->effective_price,
                            'currency_code' => $account->currency_code,
                            'due_date' => $model->allocated_at?->toDateString() ?? now()->toDateString(),
                            'status' => 'posted',
                            'posted_at' => now(),
                            'created_by' => $request->user()->id,
                        ],
                    );
                }
            }

            if ($model->stand_id) {
                Stand::whereKey($model->stand_id)->update([
                    'physical_status' => match ($model->status) {
                        'allocated' => 'allocated',
                        'cancelled' => 'available',
                        default => 'reserved',
                    },
                ]);
            }
        }

        if ($key === 'payments') {
            /** @var Payment $model */
            if ($model->cash_session_id) {
                $this->refreshCashSession($model->cash_session_id);
            }
            if ($model->status === 'approved') {
                $this->issueReceipt($model, $request);
            }
        }

        if ($key === 'payment-allocations') {
            /** @var PaymentAllocation $model */
            $this->refreshChargeStatus($model->charge_id);
        }

        if ($key === 'expenses') {
            /** @var Expense $model */
            ExpenseLine::updateOrCreate(
                ['expense_id' => $model->id],
                [
                    'category_id' => $validated['category_id'],
                    'description' => $model->purpose,
                    'amount' => $model->total_amount,
                    'tax_amount' => 0,
                ],
            );

            if ($model->status === 'submitted' && ! $model->approval_request_id) {
                $approval = ApprovalRequest::create([
                    'organization_id' => $request->user()->organization_id,
                    'branch_id' => $model->branch_id,
                    'subject_type' => Expense::class,
                    'subject_id' => $model->id,
                    'workflow_type' => 'expense_approval',
                    'current_stage' => 1,
                    'status' => 'pending',
                    'maker_id' => $model->made_by,
                    'submitted_at' => now(),
                ]);
                $managerRole = Role::query()
                    ->where('organization_id', $request->user()->organization_id)
                    ->where('code', 'BRANCH_MANAGER')
                    ->first();
                $step = ApprovalStep::create([
                    'approval_request_id' => $approval->id,
                    'sequence_no' => 1,
                    'required_role_id' => $managerRole?->id,
                    'threshold_min' => $model->total_amount,
                    'threshold_currency' => $model->currency_code,
                    'status' => 'pending',
                ]);
                WorkflowAction::create([
                    'approval_request_id' => $approval->id,
                    'approval_step_id' => $step->id,
                    'action' => 'submitted',
                    'actor_id' => $request->user()->id,
                    'note' => 'Expense submitted for approval.',
                    'acted_at' => now(),
                ]);
                $model->forceFill(['approval_request_id' => $approval->id])->saveQuietly();
            }
        }
    }

    private function refreshChargeStatus(int $chargeId): void
    {
        $charge = AccountCharge::findOrFail($chargeId);
        if ($charge->status === 'void') {
            return;
        }

        $allocated = PaymentAllocation::query()->where('charge_id', $charge->id)->sum('amount');
        $charge->forceFill([
            'status' => match (true) {
                (float) $allocated >= (float) $charge->amount => 'paid',
                (float) $allocated > 0 => 'partially_paid',
                default => 'posted',
            },
            'posted_at' => $charge->posted_at ?? now(),
        ])->save();
    }

    private function refreshCashSession(int $cashSessionId): void
    {
        $session = CashSession::findOrFail($cashSessionId);
        $received = Payment::query()
            ->where('cash_session_id', $session->id)
            ->where('status', 'approved')
            ->whereHas('method', fn (Builder $builder) => $builder->where('cash_equivalent', true))
            ->sum('amount');

        $session->forceFill(['expected_cash' => (float) $session->opening_float + (float) $received])->save();
    }

    private function issueReceipt(Payment $payment, Request $request): void
    {
        if (Receipt::where('payment_id', $payment->id)->exists()) {
            return;
        }

        $payment->loadMissing([
            'account.clientFile.client',
            'branch',
            'method',
            'allocations.charge',
        ]);
        $issuedAt = now();
        $receiptNo = $this->nextReceiptNumber($request->user()->organization_id, $payment->branch_id, $issuedAt->year);
        $client = $payment->account->clientFile->client;
        $snapshot = [
            'receipt_no' => $receiptNo,
            'payment_public_id' => $payment->public_id,
            'client' => [
                'number' => $client->client_no,
                'name' => trim("{$client->first_name} {$client->last_name}"),
            ],
            'account_no' => $payment->account->account_no,
            'branch' => $payment->branch->name,
            'amount' => $payment->amount,
            'currency' => $payment->currency_code,
            'method' => $payment->method->name,
            'reference' => $payment->external_reference,
            'received_at' => $payment->received_at?->toIso8601String(),
            'issued_at' => $issuedAt->toIso8601String(),
            'allocations' => $payment->allocations->map(fn (PaymentAllocation $allocation) => [
                'charge' => $allocation->charge->charge_type,
                'amount' => $allocation->amount,
            ])->values()->all(),
        ];
        $encodedSnapshot = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

        $receipt = Receipt::create([
            'organization_id' => $request->user()->organization_id,
            'payment_id' => $payment->id,
            'receipt_no' => $receiptNo,
            'issued_at' => $issuedAt,
            'content_hash' => hash('sha256', $encodedSnapshot),
            'qr_token_hash' => hash('sha256', Str::random(64)),
            'snapshot_json' => $snapshot,
            'issued_by' => $request->user()->id,
        ]);
        $this->auditLogger->record($request, 'receipts.issued', $receipt, null, $this->auditData($receipt));
    }

    private function nextReceiptNumber(int $organizationId, int $branchId, int $year): string
    {
        $sequence = DocumentSequence::firstOrCreate(
            [
                'organization_id' => $organizationId,
                'branch_id' => $branchId,
                'document_type' => 'RECEIPT',
                'period_key' => (string) $year,
            ],
            ['prefix' => 'RCT', 'next_value' => 1, 'padding' => 6],
        );
        $sequence = DocumentSequence::query()->lockForUpdate()->findOrFail($sequence->id);
        $receiptNo = ($sequence->prefix ? $sequence->prefix.'-' : '').str_pad((string) $sequence->next_value, $sequence->padding, '0', STR_PAD_LEFT);
        $sequence->increment('next_value');

        return $receiptNo;
    }

    private function serialize(string $key, Model $record): array
    {
        $data = $record->toArray();

        if ($key === 'users') {
            $data['password'] = '';
            $data['role_ids'] = $record->roles->pluck('id')->all();
            $data['branch_ids'] = $record->branchAccess->where('active', true)->pluck('branch_id')->all();
            $data['role_names'] = $record->roles->pluck('name')->join(', ');
        }

        if ($key === 'roles') {
            $data['permission_ids'] = $record->permissions->pluck('id')->all();
            $data['permissions_count'] = $record->permissions->count();
        }

        if ($key === 'system-settings') {
            $data['value_json'] = json_encode($record->value_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        }

        if ($key === 'bank-accounts') {
            $data['account_reference'] = '';
            unset($data['account_reference_encrypted']);
        }

        if ($key === 'development-phases') {
            $data['development_name'] = $record->development?->name;
        }

        if ($key === 'stands') {
            $data['phase_name'] = $record->phase
                ? "{$record->phase->development?->name} — {$record->phase->name}"
                : null;
            $data['stand_type_name'] = $record->standType?->name;
            $data['geo_json'] = $record->geo_json
                ? json_encode($record->geo_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
                : '';
        }

        if ($key === 'clients') {
            $data['client_name'] = trim("{$record->first_name} {$record->middle_names} {$record->last_name}");
            $data['branch_name'] = $record->owningBranch?->name;
            $data['national_id'] = '';
            unset($data['national_id_hash'], $data['national_id_encrypted']);
        }

        if ($key === 'stand-allocations') {
            $client = $record->clientFile?->client;
            $data['client_name'] = $client ? trim("{$client->first_name} {$client->last_name}") : null;
            $data['client_file'] = $record->clientFile?->file_no;
            $data['stand_name'] = $record->stand
                ? "{$record->stand->phase?->development?->name} — Stand {$record->stand->stand_no}"
                : 'Not assigned';
            $data['branch_name'] = $record->branch?->name;
            $charges = $record->account?->charges ?? collect();
            $chargeTotal = (float) $charges->where('status', '!=', 'void')->sum('amount');
            $paidTotal = (float) $charges
                ->flatMap->paymentAllocations
                ->filter(fn (PaymentAllocation $allocation) => $allocation->payment?->status === 'approved')
                ->sum('amount');
            $data['balance'] = max(0, $chargeTotal - $paidTotal);
            $data['next_due_date'] = $record->installments
                ?->whereNotIn('status', ['paid', 'waived'])
                ->sortBy('due_date')
                ->first()
                ?->due_date
                ?->toDateString();
        }

        if ($key === 'account-charges') {
            $client = $record->account?->clientFile?->client;
            $data['client_name'] = $client ? trim("{$client->first_name} {$client->last_name}") : null;
            $data['account_no'] = $record->account?->account_no;
        }

        if ($key === 'payments') {
            $client = $record->account?->clientFile?->client;
            $data['client_name'] = $client ? trim("{$client->first_name} {$client->last_name}") : null;
            $data['account_no'] = $record->account?->account_no;
            $data['branch_name'] = $record->branch?->name;
            $data['method_name'] = $record->method?->name;
        }

        if ($key === 'payment-allocations') {
            $client = $record->payment?->account?->clientFile?->client;
            $data['client_name'] = $client ? trim("{$client->first_name} {$client->last_name}") : null;
            $data['payment_reference'] = $record->payment?->external_reference ?: "Payment #{$record->payment_id}";
            $data['charge_name'] = trim("{$record->charge?->charge_type} {$record->charge?->description}");
        }

        if ($key === 'receipts') {
            $client = $record->payment?->account?->clientFile?->client;
            $data['client_name'] = $client ? trim("{$client->first_name} {$client->last_name}") : null;
            $data['amount'] = $record->payment?->amount;
            $data['currency_code'] = $record->payment?->currency_code;
            $data['issuer_name'] = $record->issuer?->name;
        }

        if ($key === 'cash-sessions') {
            $data['branch_name'] = $record->branch?->name;
            $data['cashier_name'] = $record->cashier?->name;
            $data['variance'] = $record->declared_cash === null
                ? null
                : (float) $record->declared_cash - (float) $record->expected_cash;
        }

        if ($key === 'bank-deposits') {
            $data['branch_name'] = $record->branch?->name;
            $data['bank_account_name'] = $record->bankAccount
                ? "{$record->bankAccount->bank_name} {$record->bankAccount->account_mask}"
                : null;
        }

        if ($key === 'reconciliation-runs') {
            $data['branch_name'] = $record->branch?->name;
            $data['prepared_by_name'] = $record->preparedBy?->name;
        }

        if ($key === 'expenses') {
            $line = $record->lines->first();
            $data['branch_name'] = $record->branch?->name;
            $data['category_id'] = $line?->category_id;
            $data['category_name'] = $line?->category?->name;
            $data['maker_name'] = $record->maker?->name;
            $data['approver_name'] = $record->approver?->name;
        }

        if ($key === 'petty-cash-entries') {
            $data['branch_name'] = $record->branch?->name;
            $data['cash_session_name'] = $record->cashSession ? "Session #{$record->cashSession->id}" : null;
            $data['expense_name'] = $record->expense ? "{$record->expense->expense_no} — {$record->expense->payee}" : null;
            $data['poster_name'] = $record->poster?->name;
        }

        if ($key === 'audit-events') {
            $data['actor_name'] = $record->actor?->name ?? 'System';
            $data['subject'] = "{$record->subject_type} #{$record->subject_id}";
        }

        return $data;
    }

    private function options(Request $request): array
    {
        $organizationId = $request->user()->organization_id;

        return [
            'branches' => Branch::query()
                ->where('organization_id', $organizationId)
                ->when(! $request->user()->can('phase-one.manage'), fn (Builder $query) => $query->whereIn('id', UserBranchAccess::query()->where('user_id', $request->user()->id)->where('active', true)->pluck('branch_id')))
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id as value', 'name as label']),
            'currencies' => Currency::query()->where('active', true)->orderBy('code')->get()->map(fn (Currency $currency) => ['value' => $currency->code, 'label' => "{$currency->code} — {$currency->name}"]),
            'roles' => Role::query()->where('organization_id', $organizationId)->where('active', true)->orderBy('name')->get(['id as value', 'name as label']),
            'permissions' => Permission::query()->where('active', true)->orderBy('name')->get(['id', 'name', 'description'])->map(fn (Permission $permission) => ['value' => $permission->id, 'label' => $permission->description ?: $permission->name]),
            'developments' => Development::query()
                ->where('organization_id', $organizationId)
                ->whereNot('status', 'inactive')
                ->orderBy('name')
                ->get(['id as value', 'name as label']),
            'development-phases' => DevelopmentPhase::query()
                ->whereHas('development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->whereNot('survey_status', 'archived')
                ->with('development:id,name')
                ->orderBy('name')
                ->get()
                ->map(fn (DevelopmentPhase $phase) => ['value' => $phase->id, 'label' => "{$phase->development->name} — {$phase->name}"]),
            'stand-types' => StandType::query()
                ->where('organization_id', $organizationId)
                ->where('active', true)
                ->orderBy('name')
                ->get(['id as value', 'name as label']),
            'stands' => Stand::query()
                ->whereHas('phase.development', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->whereNot('physical_status', 'withdrawn')
                ->with('phase.development:id,name')
                ->orderBy('stand_no')
                ->get()
                ->map(fn (Stand $stand) => ['value' => $stand->id, 'label' => "{$stand->phase->development->name} — Stand {$stand->stand_no}"]),
            'client-files' => ClientFile::query()
                ->whereHas('client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->where('lifecycle_status', 'open')
                ->with('client:id,client_no,first_name,last_name')
                ->orderBy('file_no')
                ->get()
                ->map(fn (ClientFile $file) => ['value' => $file->id, 'label' => "{$file->client->client_no} — {$file->client->first_name} {$file->client->last_name} ({$file->file_no})"]),
            'client-accounts' => ClientAccount::query()
                ->whereHas('clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->where('status', 'open')
                ->with('clientFile.client:id,client_no,first_name,last_name')
                ->orderBy('account_no')
                ->get()
                ->map(fn (ClientAccount $account) => ['value' => $account->id, 'label' => "{$account->account_no} — {$account->clientFile->client->first_name} {$account->clientFile->client->last_name}"]),
            'payments' => Payment::query()
                ->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->whereNot('status', 'reversed')
                ->with('account.clientFile.client:id,first_name,last_name')
                ->latest('received_at')
                ->get()
                ->map(fn (Payment $payment) => ['value' => $payment->id, 'label' => "Payment #{$payment->id} — {$payment->account->clientFile->client->first_name} {$payment->account->clientFile->client->last_name} ({$payment->currency_code} {$payment->amount})"]),
            'account-charges' => AccountCharge::query()
                ->whereHas('account.clientFile.client', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->whereNotIn('status', ['paid', 'void'])
                ->with('account.clientFile.client:id,first_name,last_name')
                ->latest()
                ->get()
                ->map(fn (AccountCharge $charge) => ['value' => $charge->id, 'label' => "{$charge->charge_type} — {$charge->account->clientFile->client->first_name} {$charge->account->clientFile->client->last_name} ({$charge->currency_code} {$charge->amount})"]),
            'payment-methods' => PaymentMethod::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['id as value', 'name as label']),
            'users' => User::query()
                ->where('organization_id', $organizationId)
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id as value', 'name as label']),
            'cash-sessions' => CashSession::query()
                ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->where('status', 'open')
                ->with(['branch:id,name', 'cashier:id,name'])
                ->latest('opened_at')
                ->get()
                ->map(fn (CashSession $session) => ['value' => $session->id, 'label' => "{$session->branch->name} — {$session->cashier->name} ({$session->currency_code})"]),
            'bank-accounts' => BankAccount::query()
                ->where('organization_id', $organizationId)
                ->where('active', true)
                ->orderBy('bank_name')
                ->get()
                ->map(fn (BankAccount $account) => ['value' => $account->id, 'label' => "{$account->bank_name} — {$account->account_mask} ({$account->currency_code})"]),
            'expense-categories' => ExpenseCategory::query()
                ->where('organization_id', $organizationId)
                ->where('active', true)
                ->orderBy('name')
                ->get(['id as value', 'name as label']),
            'expenses' => Expense::query()
                ->whereHas('branch', fn (Builder $builder) => $builder->where('organization_id', $organizationId))
                ->whereIn('status', ['approved', 'paid'])
                ->latest('incurred_at')
                ->get()
                ->map(fn (Expense $expense) => ['value' => $expense->id, 'label' => "{$expense->expense_no} — {$expense->payee} ({$expense->currency_code} {$expense->total_amount})"]),
        ];
    }

    private function auditData(Model $model): array
    {
        return Arr::except($model->getAttributes(), [
            'password',
            'remember_token',
            'account_reference_encrypted',
            'national_id_hash',
            'national_id_encrypted',
        ]);
    }

    private function definitions(): array
    {
        $status = [['value' => 'active', 'label' => 'Active'], ['value' => 'inactive', 'label' => 'Inactive']];
        $yesNo = [['value' => true, 'label' => 'Yes'], ['value' => false, 'label' => 'No']];

        return [
            'organizations' => $this->makeDefinition(Organization::class, 'Organization', 'Company identity, base currency and operating timezone.', 'organization', [
                ['key' => 'code', 'label' => 'Code'], ['key' => 'legal_name', 'label' => 'Legal name'], ['key' => 'base_currency_code', 'label' => 'Currency'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'legal_name', 'label' => 'Legal name', 'required' => true], ['name' => 'trading_name', 'label' => 'Trading name'], ['name' => 'registration_no', 'label' => 'Registration number'], ['name' => 'base_currency_code', 'label' => 'Base currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'timezone', 'label' => 'Timezone', 'default' => 'Africa/Harare', 'required' => true], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => $status, 'default' => 'active', 'required' => true],
            ], ['code', 'legal_name', 'trading_name']),
            'branches' => $this->makeDefinition(Branch::class, 'Branches', 'Operational locations and their contact details.', 'organization', [
                ['key' => 'code', 'label' => 'Code'], ['key' => 'name', 'label' => 'Branch'], ['key' => 'email', 'label' => 'Email'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'name', 'label' => 'Branch name', 'required' => true], ['name' => 'timezone', 'label' => 'Timezone', 'default' => 'Africa/Harare', 'required' => true], ['name' => 'address', 'label' => 'Address', 'type' => 'textarea'], ['name' => 'phone', 'label' => 'Phone'], ['name' => 'email', 'label' => 'Email', 'type' => 'email'], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => $status, 'default' => 'active', 'required' => true],
            ], ['code', 'name', 'email']),
            'users' => $this->makeDefinition(User::class, 'Users & access', 'User accounts, roles and branch access assignments.', 'users', [
                ['key' => 'name', 'label' => 'User'], ['key' => 'email', 'label' => 'Email'], ['key' => 'role_names', 'label' => 'Roles'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'name', 'label' => 'Full name', 'required' => true], ['name' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true], ['name' => 'password', 'label' => 'Password', 'type' => 'password', 'help' => 'Leave blank when editing to keep the current password.'], ['name' => 'home_branch_id', 'label' => 'Home branch', 'type' => 'select', 'options' => 'branches'], ['name' => 'role_ids', 'label' => 'Roles', 'type' => 'multiselect', 'options' => 'roles'], ['name' => 'branch_ids', 'label' => 'Branch access', 'type' => 'multiselect', 'options' => 'branches'], ['name' => 'mfa_state', 'label' => 'MFA policy', 'type' => 'select', 'choices' => [['value' => 'disabled', 'label' => 'Disabled'], ['value' => 'required', 'label' => 'Required'], ['value' => 'enabled', 'label' => 'Enabled']], 'default' => 'disabled', 'required' => true], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'active', 'label' => 'Active'], ['value' => 'suspended', 'label' => 'Suspended'], ['value' => 'inactive', 'label' => 'Inactive']], 'default' => 'active', 'required' => true],
            ], ['name', 'email']),
            'roles' => $this->makeDefinition(Role::class, 'Roles', 'Role definitions and permission bundles.', 'roles', [
                ['key' => 'name', 'label' => 'Role'], ['key' => 'code', 'label' => 'Code'], ['key' => 'scope_type', 'label' => 'Scope'], ['key' => 'permissions_count', 'label' => 'Permissions'], ['key' => 'active', 'label' => 'Active', 'badge' => true],
            ], [
                ['name' => 'name', 'label' => 'Role name', 'required' => true], ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'description', 'label' => 'Description', 'type' => 'textarea'], ['name' => 'scope_type', 'label' => 'Scope', 'type' => 'select', 'choices' => [['value' => 'organization', 'label' => 'Organization'], ['value' => 'branch', 'label' => 'Branch']], 'default' => 'branch', 'required' => true], ['name' => 'permission_ids', 'label' => 'Permissions', 'type' => 'multiselect', 'options' => 'permissions'], ['name' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'default' => true],
            ], ['name', 'code']),
            'permissions' => $this->makeDefinition(Permission::class, 'Permissions', 'Permission catalogue used by roles and authorization gates.', 'none', [
                ['key' => 'name', 'label' => 'Permission'], ['key' => 'code', 'label' => 'Code'], ['key' => 'risk_level', 'label' => 'Risk'], ['key' => 'active', 'label' => 'Active', 'badge' => true],
            ], [
                ['name' => 'name', 'label' => 'Permission name', 'required' => true], ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'description', 'label' => 'Description', 'type' => 'textarea'], ['name' => 'risk_level', 'label' => 'Risk level', 'type' => 'select', 'choices' => [['value' => 'standard', 'label' => 'Standard'], ['value' => 'sensitive', 'label' => 'Sensitive'], ['value' => 'critical', 'label' => 'Critical']], 'default' => 'standard', 'required' => true], ['name' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'default' => true],
            ], ['name', 'code', 'description']),
            'currencies' => $this->makeDefinition(Currency::class, 'Currencies', 'Supported transaction and reporting currencies.', 'none', [
                ['key' => 'code', 'label' => 'Code'], ['key' => 'name', 'label' => 'Currency'], ['key' => 'symbol', 'label' => 'Symbol'], ['key' => 'decimal_places', 'label' => 'Decimals'], ['key' => 'active', 'label' => 'Active', 'badge' => true],
            ], [
                ['name' => 'code', 'label' => 'ISO code', 'required' => true], ['name' => 'name', 'label' => 'Currency name', 'required' => true], ['name' => 'symbol', 'label' => 'Symbol'], ['name' => 'decimal_places', 'label' => 'Decimal places', 'type' => 'number', 'default' => 2, 'required' => true], ['name' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'default' => true],
            ], ['code', 'name']),
            'exchange-rates' => $this->makeDefinition(ExchangeRate::class, 'Exchange rates', 'Approved daily rates between supported currencies.', 'none', [
                ['key' => 'rate_date', 'label' => 'Date'], ['key' => 'base_currency', 'label' => 'Base'], ['key' => 'quote_currency', 'label' => 'Quote'], ['key' => 'rate', 'label' => 'Rate'], ['key' => 'source', 'label' => 'Source'],
            ], [
                ['name' => 'rate_date', 'label' => 'Rate date', 'type' => 'date', 'required' => true], ['name' => 'base_currency', 'label' => 'Base currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'quote_currency', 'label' => 'Quote currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'rate', 'label' => 'Rate', 'type' => 'number', 'step' => '0.00000001', 'required' => true], ['name' => 'source', 'label' => 'Source', 'required' => true],
            ], ['base_currency', 'quote_currency', 'source']),
            'payment-methods' => $this->makeDefinition(PaymentMethod::class, 'Payment methods', 'Allowed collection methods and reference requirements.', 'none', [
                ['key' => 'code', 'label' => 'Code'], ['key' => 'name', 'label' => 'Method'], ['key' => 'requires_reference', 'label' => 'Reference', 'badge' => true], ['key' => 'cash_equivalent', 'label' => 'Cash equivalent', 'badge' => true], ['key' => 'active', 'label' => 'Active', 'badge' => true],
            ], [
                ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'name', 'label' => 'Method name', 'required' => true], ['name' => 'requires_reference', 'label' => 'Requires reference', 'type' => 'checkbox', 'default' => true], ['name' => 'cash_equivalent', 'label' => 'Cash equivalent', 'type' => 'checkbox', 'default' => false], ['name' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'default' => true],
            ], ['code', 'name']),
            'bank-accounts' => $this->makeDefinition(BankAccount::class, 'Bank accounts', 'Organization bank accounts with protected account references.', 'organization', [
                ['key' => 'bank_name', 'label' => 'Bank'], ['key' => 'account_name', 'label' => 'Account'], ['key' => 'account_mask', 'label' => 'Masked number'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'active', 'label' => 'Active', 'badge' => true],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches'], ['name' => 'bank_name', 'label' => 'Bank name', 'required' => true], ['name' => 'account_name', 'label' => 'Account name', 'required' => true], ['name' => 'account_mask', 'label' => 'Masked account number', 'help' => 'Store only a safe display value, for example **** 1234.', 'required' => true], ['name' => 'account_reference', 'label' => 'Full account reference', 'type' => 'password', 'help' => 'Encrypted before storage; leave blank when editing.'], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'default' => true],
            ], ['bank_name', 'account_name', 'account_mask']),
            'stand-types' => $this->makeDefinition(StandType::class, 'Stand types', 'Property classifications used by developments and stands.', 'organization', [
                ['key' => 'code', 'label' => 'Code'], ['key' => 'name', 'label' => 'Type'], ['key' => 'description', 'label' => 'Description'], ['key' => 'active', 'label' => 'Active', 'badge' => true],
            ], [
                ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'name', 'label' => 'Type name', 'required' => true], ['name' => 'description', 'label' => 'Description', 'type' => 'textarea'], ['name' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'default' => true],
            ], ['code', 'name', 'description']),
            'developments' => $this->makeDefinition(Development::class, 'Developments', 'Property developments owned and managed by the organization.', 'organization', [
                ['key' => 'code', 'label' => 'Code'], ['key' => 'name', 'label' => 'Development'], ['key' => 'location', 'label' => 'Location'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'name', 'label' => 'Development name', 'required' => true], ['name' => 'location', 'label' => 'Location', 'required' => true], ['name' => 'description', 'label' => 'Description', 'type' => 'textarea'], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'planning', 'label' => 'Planning'], ['value' => 'active', 'label' => 'Active'], ['value' => 'on_hold', 'label' => 'On hold'], ['value' => 'completed', 'label' => 'Completed'], ['value' => 'inactive', 'label' => 'Inactive']], 'default' => 'planning', 'required' => true],
            ], ['code', 'name', 'location', 'description']),
            'development-phases' => $this->makeDefinition(DevelopmentPhase::class, 'Development phases', 'Survey and delivery phases within each development.', 'development', [
                ['key' => 'development_name', 'label' => 'Development'], ['key' => 'code', 'label' => 'Code'], ['key' => 'name', 'label' => 'Phase'], ['key' => 'survey_status', 'label' => 'Survey status', 'badge' => true], ['key' => 'planned_completion_date', 'label' => 'Planned completion'],
            ], [
                ['name' => 'development_id', 'label' => 'Development', 'type' => 'select', 'options' => 'developments', 'required' => true], ['name' => 'code', 'label' => 'Phase code', 'required' => true], ['name' => 'name', 'label' => 'Phase name', 'required' => true], ['name' => 'survey_status', 'label' => 'Survey status', 'type' => 'select', 'choices' => [['value' => 'pending', 'label' => 'Pending'], ['value' => 'in_progress', 'label' => 'In progress'], ['value' => 'approved', 'label' => 'Approved'], ['value' => 'archived', 'label' => 'Archived']], 'default' => 'pending', 'required' => true], ['name' => 'planned_completion_date', 'label' => 'Planned completion', 'type' => 'date'],
            ], ['code', 'name']),
            'stands' => $this->makeDefinition(Stand::class, 'Stands', 'Individual stands, pricing and survey details.', 'phase', [
                ['key' => 'stand_no', 'label' => 'Stand'], ['key' => 'phase_name', 'label' => 'Development phase'], ['key' => 'stand_type_name', 'label' => 'Type'], ['key' => 'list_price', 'label' => 'List price'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'physical_status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'phase_id', 'label' => 'Development phase', 'type' => 'select', 'options' => 'development-phases', 'required' => true], ['name' => 'stand_type_id', 'label' => 'Stand type', 'type' => 'select', 'options' => 'stand-types', 'required' => true], ['name' => 'stand_no', 'label' => 'Stand number', 'required' => true], ['name' => 'area_sqm', 'label' => 'Area (m²)', 'type' => 'number', 'step' => '0.01'], ['name' => 'list_price', 'label' => 'List price', 'type' => 'number', 'step' => '0.01', 'required' => true], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'physical_status', 'label' => 'Physical status', 'type' => 'select', 'choices' => [['value' => 'planned', 'label' => 'Planned'], ['value' => 'available', 'label' => 'Available'], ['value' => 'reserved', 'label' => 'Reserved'], ['value' => 'allocated', 'label' => 'Allocated'], ['value' => 'withdrawn', 'label' => 'Withdrawn']], 'default' => 'planned', 'required' => true], ['name' => 'survey_reference', 'label' => 'Survey reference'], ['name' => 'geo_json', 'label' => 'GeoJSON', 'type' => 'textarea', 'help' => 'Optional GeoJSON geometry or feature data for this stand.'],
            ], ['stand_no', 'survey_reference']),
            'clients' => $this->makeDefinition(Client::class, 'Clients', 'Client identity, contact information and owning branch.', 'organization', [
                ['key' => 'client_no', 'label' => 'Client number'], ['key' => 'client_name', 'label' => 'Client'], ['key' => 'branch_name', 'label' => 'Owning branch'], ['key' => 'phone_normalized', 'label' => 'Phone'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'owning_branch_id', 'label' => 'Owning branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'client_no', 'label' => 'Client number', 'required' => true], ['name' => 'first_name', 'label' => 'First name', 'required' => true], ['name' => 'middle_names', 'label' => 'Middle names'], ['name' => 'last_name', 'label' => 'Last name', 'required' => true], ['name' => 'national_id', 'label' => 'National ID', 'type' => 'password', 'help' => 'Encrypted before storage. Leave blank when editing to keep the current value.'], ['name' => 'phone_normalized', 'label' => 'Phone'], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'prospect', 'label' => 'Prospect'], ['value' => 'active', 'label' => 'Active'], ['value' => 'inactive', 'label' => 'Inactive'], ['value' => 'blocked', 'label' => 'Blocked']], 'default' => 'active', 'required' => true],
            ], ['client_no', 'first_name', 'middle_names', 'last_name', 'phone_normalized']),
            'stand-allocations' => $this->makeDefinition(StandAllocation::class, 'Stand allocations', 'Connect client files to stands, pricing and approval status.', 'client', [
                ['key' => 'client_name', 'label' => 'Client'], ['key' => 'stand_name', 'label' => 'Stand'], ['key' => 'branch_name', 'label' => 'Branch'], ['key' => 'effective_price', 'label' => 'Price'], ['key' => 'balance', 'label' => 'Balance'], ['key' => 'next_due_date', 'label' => 'Next due'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'client_file_id', 'label' => 'Client file', 'type' => 'select', 'options' => 'client-files', 'required' => true], ['name' => 'stand_id', 'label' => 'Stand', 'type' => 'select', 'options' => 'stands'], ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'category', 'label' => 'Allocation category', 'type' => 'select', 'choices' => [['value' => 'cash', 'label' => 'Cash'], ['value' => 'credit', 'label' => 'Credit'], ['value' => 'special', 'label' => 'Special'], ['value' => 'staff', 'label' => 'Staff']], 'default' => 'cash', 'required' => true], ['name' => 'allocated_at', 'label' => 'Allocated at', 'type' => 'datetime-local'], ['name' => 'effective_price', 'label' => 'Effective price', 'type' => 'number', 'step' => '0.01'], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies'], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'pending', 'label' => 'Pending'], ['value' => 'approved', 'label' => 'Approved'], ['value' => 'allocated', 'label' => 'Allocated'], ['value' => 'cancelled', 'label' => 'Cancelled']], 'default' => 'pending', 'required' => true],
            ], ['category', 'status']),
            'account-charges' => $this->makeDefinition(AccountCharge::class, 'Charges', 'Post client account charges and track their settlement status.', 'account', [
                ['key' => 'client_name', 'label' => 'Client'], ['key' => 'account_no', 'label' => 'Account'], ['key' => 'charge_type', 'label' => 'Charge'], ['key' => 'amount', 'label' => 'Amount'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'due_date', 'label' => 'Due date'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'account_id', 'label' => 'Client account', 'type' => 'select', 'options' => 'client-accounts', 'required' => true], ['name' => 'charge_type', 'label' => 'Charge type', 'type' => 'select', 'choices' => [['value' => 'stand_price', 'label' => 'Stand price'], ['value' => 'administration', 'label' => 'Administration'], ['value' => 'penalty', 'label' => 'Penalty'], ['value' => 'service', 'label' => 'Service'], ['value' => 'adjustment', 'label' => 'Adjustment']], 'default' => 'stand_price', 'required' => true], ['name' => 'description', 'label' => 'Description', 'type' => 'textarea'], ['name' => 'amount', 'label' => 'Amount', 'type' => 'number', 'step' => '0.01', 'required' => true], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'due_date', 'label' => 'Due date', 'type' => 'date'], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'draft', 'label' => 'Draft'], ['value' => 'posted', 'label' => 'Posted'], ['value' => 'partially_paid', 'label' => 'Partially paid'], ['value' => 'paid', 'label' => 'Paid'], ['value' => 'void', 'label' => 'Void']], 'default' => 'draft', 'required' => true],
            ], ['charge_type', 'description', 'status']),
            'payments' => $this->makeDefinition(Payment::class, 'Payments', 'Capture client payments with controlled approval and receipt issuance.', 'account', [
                ['key' => 'client_name', 'label' => 'Client'], ['key' => 'external_reference', 'label' => 'Reference'], ['key' => 'method_name', 'label' => 'Method'], ['key' => 'amount', 'label' => 'Amount'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'received_at', 'label' => 'Received'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'account_id', 'label' => 'Client account', 'type' => 'select', 'options' => 'client-accounts', 'required' => true], ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'cash_session_id', 'label' => 'Cash session', 'type' => 'select', 'options' => 'cash-sessions', 'help' => 'Required for cash-equivalent payment methods.'], ['name' => 'amount', 'label' => 'Amount received', 'type' => 'number', 'step' => '0.01', 'required' => true], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'method_id', 'label' => 'Payment method', 'type' => 'select', 'options' => 'payment-methods', 'required' => true], ['name' => 'external_reference', 'label' => 'External reference'], ['name' => 'received_at', 'label' => 'Received at', 'type' => 'datetime-local'], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'draft', 'label' => 'Draft'], ['value' => 'pending', 'label' => 'Pending approval'], ['value' => 'approved', 'label' => 'Approved'], ['value' => 'reversed', 'label' => 'Reversed']], 'default' => 'pending', 'required' => true],
            ], ['external_reference', 'status']),
            'payment-allocations' => $this->makeDefinition(PaymentAllocation::class, 'Payment allocations', 'Apply received payments to outstanding client charges.', 'account', [
                ['key' => 'client_name', 'label' => 'Client'], ['key' => 'payment_reference', 'label' => 'Payment'], ['key' => 'charge_name', 'label' => 'Charge'], ['key' => 'amount', 'label' => 'Allocated amount'],
            ], [
                ['name' => 'payment_id', 'label' => 'Payment', 'type' => 'select', 'options' => 'payments', 'required' => true], ['name' => 'charge_id', 'label' => 'Outstanding charge', 'type' => 'select', 'options' => 'account-charges', 'required' => true], ['name' => 'amount', 'label' => 'Amount to allocate', 'type' => 'number', 'step' => '0.01', 'required' => true],
            ], []),
            'receipts' => $this->makeDefinition(Receipt::class, 'Receipts', 'Immutable receipt snapshots generated for approved payments.', 'organization', [
                ['key' => 'receipt_no', 'label' => 'Receipt'], ['key' => 'client_name', 'label' => 'Client'], ['key' => 'amount', 'label' => 'Amount'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'issued_at', 'label' => 'Issued'], ['key' => 'issuer_name', 'label' => 'Issued by'], ['key' => 'content_hash', 'label' => 'Integrity hash'],
            ], [], ['receipt_no', 'content_hash'], true),
            'cash-sessions' => $this->makeDefinition(CashSession::class, 'Cash sessions', 'Open and close cashier sessions with expected and declared cash controls.', 'branch', [
                ['key' => 'branch_name', 'label' => 'Branch'], ['key' => 'cashier_name', 'label' => 'Cashier'], ['key' => 'opened_at', 'label' => 'Opened'], ['key' => 'expected_cash', 'label' => 'Expected'], ['key' => 'declared_cash', 'label' => 'Declared'], ['key' => 'variance', 'label' => 'Variance'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'cashier_id', 'label' => 'Cashier', 'type' => 'select', 'options' => 'users', 'required' => true], ['name' => 'opened_at', 'label' => 'Opened at', 'type' => 'datetime-local'], ['name' => 'closed_at', 'label' => 'Closed at', 'type' => 'datetime-local'], ['name' => 'opening_float', 'label' => 'Opening float', 'type' => 'number', 'step' => '0.01', 'default' => 0, 'required' => true], ['name' => 'expected_cash', 'label' => 'Expected cash', 'type' => 'number', 'step' => '0.01', 'default' => 0, 'required' => true], ['name' => 'declared_cash', 'label' => 'Declared cash', 'type' => 'number', 'step' => '0.01'], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'open', 'label' => 'Open'], ['value' => 'closing', 'label' => 'Closing'], ['value' => 'closed', 'label' => 'Closed'], ['value' => 'void', 'label' => 'Void']], 'default' => 'open', 'required' => true],
            ], ['status']),
            'bank-deposits' => $this->makeDefinition(BankDeposit::class, 'Bank deposits', 'Record branch deposits into approved organization bank accounts.', 'branch', [
                ['key' => 'deposit_date', 'label' => 'Date'], ['key' => 'branch_name', 'label' => 'Branch'], ['key' => 'bank_account_name', 'label' => 'Bank account'], ['key' => 'reference', 'label' => 'Reference'], ['key' => 'amount', 'label' => 'Amount'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'bank_account_id', 'label' => 'Bank account', 'type' => 'select', 'options' => 'bank-accounts', 'required' => true], ['name' => 'deposit_date', 'label' => 'Deposit date', 'type' => 'date', 'required' => true], ['name' => 'amount', 'label' => 'Amount', 'type' => 'number', 'step' => '0.01', 'required' => true], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'reference', 'label' => 'Bank reference', 'required' => true], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'draft', 'label' => 'Draft'], ['value' => 'submitted', 'label' => 'Submitted'], ['value' => 'approved', 'label' => 'Approved'], ['value' => 'cleared', 'label' => 'Cleared'], ['value' => 'void', 'label' => 'Void']], 'default' => 'draft', 'required' => true],
            ], ['reference', 'status']),
            'reconciliation-runs' => $this->makeDefinition(ReconciliationRun::class, 'Reconciliation', 'Compare expected cash, declared cash and banked totals by business date.', 'branch', [
                ['key' => 'business_date', 'label' => 'Business date'], ['key' => 'branch_name', 'label' => 'Branch'], ['key' => 'run_no', 'label' => 'Run'], ['key' => 'expected_total', 'label' => 'Expected'], ['key' => 'declared_total', 'label' => 'Declared'], ['key' => 'deposited_total', 'label' => 'Deposited'], ['key' => 'variance', 'label' => 'Variance'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'business_date', 'label' => 'Business date', 'type' => 'date', 'required' => true], ['name' => 'run_no', 'label' => 'Run number', 'type' => 'number', 'default' => 1, 'required' => true], ['name' => 'expected_total', 'label' => 'Expected total', 'type' => 'number', 'step' => '0.01', 'default' => 0, 'required' => true], ['name' => 'declared_total', 'label' => 'Declared total', 'type' => 'number', 'step' => '0.01', 'default' => 0, 'required' => true], ['name' => 'deposited_total', 'label' => 'Deposited total', 'type' => 'number', 'step' => '0.01', 'default' => 0, 'required' => true], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'draft', 'label' => 'Draft'], ['value' => 'submitted', 'label' => 'Submitted'], ['value' => 'approved', 'label' => 'Approved'], ['value' => 'rejected', 'label' => 'Rejected'], ['value' => 'void', 'label' => 'Void']], 'default' => 'draft', 'required' => true],
            ], ['status']),
            'expenses' => $this->makeDefinition(Expense::class, 'Expenses', 'Capture branch expenditure and submit it through the approval queue.', 'branch', [
                ['key' => 'expense_no', 'label' => 'Expense no.'], ['key' => 'incurred_at', 'label' => 'Incurred'], ['key' => 'branch_name', 'label' => 'Branch'], ['key' => 'category_name', 'label' => 'Category'], ['key' => 'payee', 'label' => 'Payee'], ['key' => 'purpose', 'label' => 'Purpose'], ['key' => 'total_amount', 'label' => 'Amount'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'status', 'label' => 'Status', 'badge' => true],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'category_id', 'label' => 'Expense category', 'type' => 'select', 'options' => 'expense-categories', 'required' => true], ['name' => 'expense_no', 'label' => 'Expense number', 'help' => 'Leave blank to generate the next controlled number.'], ['name' => 'payee', 'label' => 'Payee', 'required' => true], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'total_amount', 'label' => 'Total amount', 'type' => 'number', 'step' => '0.01', 'required' => true], ['name' => 'purpose', 'label' => 'Business purpose', 'type' => 'textarea', 'required' => true], ['name' => 'incurred_at', 'label' => 'Incurred at', 'type' => 'datetime-local'], ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'choices' => [['value' => 'draft', 'label' => 'Draft'], ['value' => 'submitted', 'label' => 'Submit for approval'], ['value' => 'approved', 'label' => 'Approved'], ['value' => 'rejected', 'label' => 'Rejected'], ['value' => 'paid', 'label' => 'Paid'], ['value' => 'cancelled', 'label' => 'Cancelled']], 'default' => 'draft', 'required' => true],
            ], ['expense_no', 'payee', 'purpose', 'status']),
            'petty-cash-entries' => $this->makeDefinition(PettyCashEntry::class, 'Petty cash', 'Record approved disbursements, replenishments, refunds and controlled adjustments.', 'branch', [
                ['key' => 'posted_at', 'label' => 'Posted'], ['key' => 'branch_name', 'label' => 'Branch'], ['key' => 'entry_type', 'label' => 'Entry type', 'badge' => true], ['key' => 'expense_name', 'label' => 'Expense'], ['key' => 'cash_session_name', 'label' => 'Cash session'], ['key' => 'amount', 'label' => 'Amount'], ['key' => 'currency_code', 'label' => 'Currency'], ['key' => 'poster_name', 'label' => 'Posted by'],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches', 'required' => true], ['name' => 'cash_session_id', 'label' => 'Cash session', 'type' => 'select', 'options' => 'cash-sessions'], ['name' => 'expense_id', 'label' => 'Approved expense', 'type' => 'select', 'options' => 'expenses'], ['name' => 'entry_type', 'label' => 'Entry type', 'type' => 'select', 'choices' => [['value' => 'replenishment', 'label' => 'Replenishment'], ['value' => 'disbursement', 'label' => 'Disbursement'], ['value' => 'refund', 'label' => 'Refund'], ['value' => 'adjustment', 'label' => 'Adjustment']], 'default' => 'disbursement', 'required' => true], ['name' => 'amount', 'label' => 'Amount', 'type' => 'number', 'step' => '0.01', 'required' => true], ['name' => 'currency_code', 'label' => 'Currency', 'type' => 'select', 'options' => 'currencies', 'required' => true], ['name' => 'posted_at', 'label' => 'Posted at', 'type' => 'datetime-local'],
            ], ['entry_type', 'currency_code']),
            'expense-categories' => $this->makeDefinition(ExpenseCategory::class, 'Expense categories', 'Expense policies and approval thresholds.', 'organization', [
                ['key' => 'code', 'label' => 'Code'], ['key' => 'name', 'label' => 'Category'], ['key' => 'approval_threshold', 'label' => 'Threshold'], ['key' => 'policy_currency', 'label' => 'Currency'], ['key' => 'active', 'label' => 'Active', 'badge' => true],
            ], [
                ['name' => 'code', 'label' => 'Code', 'required' => true], ['name' => 'name', 'label' => 'Category name', 'required' => true], ['name' => 'description', 'label' => 'Description', 'type' => 'textarea'], ['name' => 'approval_threshold', 'label' => 'Approval threshold', 'type' => 'number', 'step' => '0.01'], ['name' => 'policy_currency', 'label' => 'Policy currency', 'type' => 'select', 'options' => 'currencies'], ['name' => 'effective_from', 'label' => 'Effective from', 'type' => 'datetime-local'], ['name' => 'effective_to', 'label' => 'Effective to', 'type' => 'datetime-local'], ['name' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'default' => true],
            ], ['code', 'name', 'description']),
            'system-settings' => $this->makeDefinition(SystemSetting::class, 'System settings', 'Effective-dated organization and branch configuration.', 'organization', [
                ['key' => 'setting_key', 'label' => 'Setting'], ['key' => 'data_type', 'label' => 'Type'], ['key' => 'effective_from', 'label' => 'Effective from'], ['key' => 'effective_to', 'label' => 'Effective to'],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch override', 'type' => 'select', 'options' => 'branches'], ['name' => 'setting_key', 'label' => 'Setting key', 'required' => true], ['name' => 'value_json', 'label' => 'JSON value', 'type' => 'textarea', 'default' => '{}', 'required' => true], ['name' => 'data_type', 'label' => 'Data type', 'type' => 'select', 'choices' => [['value' => 'json', 'label' => 'JSON'], ['value' => 'string', 'label' => 'String'], ['value' => 'number', 'label' => 'Number'], ['value' => 'boolean', 'label' => 'Boolean']], 'default' => 'json', 'required' => true], ['name' => 'effective_from', 'label' => 'Effective from', 'type' => 'datetime-local', 'required' => true], ['name' => 'effective_to', 'label' => 'Effective to', 'type' => 'datetime-local'],
            ], ['setting_key', 'data_type']),
            'document-sequences' => $this->makeDefinition(DocumentSequence::class, 'Document sequences', 'Numbering rules for receipts, payments and operational documents.', 'organization', [
                ['key' => 'document_type', 'label' => 'Document'], ['key' => 'period_key', 'label' => 'Period'], ['key' => 'prefix', 'label' => 'Prefix'], ['key' => 'next_value', 'label' => 'Next number'], ['key' => 'padding', 'label' => 'Padding'],
            ], [
                ['name' => 'branch_id', 'label' => 'Branch', 'type' => 'select', 'options' => 'branches'], ['name' => 'document_type', 'label' => 'Document type', 'required' => true], ['name' => 'period_key', 'label' => 'Period key', 'default' => (string) now()->year, 'required' => true], ['name' => 'prefix', 'label' => 'Prefix'], ['name' => 'next_value', 'label' => 'Next value', 'type' => 'number', 'default' => 1, 'required' => true], ['name' => 'padding', 'label' => 'Padding', 'type' => 'number', 'default' => 6, 'required' => true],
            ], ['document_type', 'period_key', 'prefix']),
            'audit-events' => $this->makeDefinition(AuditEvent::class, 'Audit events', 'Tamper-evident record of Phase 1 configuration changes.', 'audit', [
                ['key' => 'occurred_at', 'label' => 'When'], ['key' => 'actor_name', 'label' => 'Actor'], ['key' => 'event_type', 'label' => 'Event'], ['key' => 'subject', 'label' => 'Subject'], ['key' => 'event_hash', 'label' => 'Integrity hash'],
            ], [], ['event_type', 'subject_type'], true),
        ];
    }

    private function makeDefinition(string $model, string $title, string $description, string $scope, array $columns, array $fields, array $searchable, bool $readOnly = false): array
    {
        return compact('model', 'title', 'description', 'scope', 'columns', 'fields', 'searchable', 'readOnly');
    }
}
