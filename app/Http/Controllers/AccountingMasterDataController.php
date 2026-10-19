<?php

namespace App\Http\Controllers;

use App\Models\CatalogItem;
use App\Models\GlAccount;
use App\Models\Supplier;
use App\Models\TaxCode;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountingMasterDataController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;
        $search = trim((string) $request->string('search'));
        $type = in_array($request->string('type')->toString(), ['product', 'service'], true)
            ? $request->string('type')->toString()
            : 'all';
        $status = in_array($request->string('status')->toString(), ['active', 'inactive'], true)
            ? $request->string('status')->toString()
            : 'all';

        $baseQuery = CatalogItem::query()->where('organization_id', $organizationId);
        $items = (clone $baseQuery)
            ->with(['supplier:id,supplier_no,name', 'expenseAccount:id,code,name', 'revenueAccount:id,code,name', 'inventoryAccount:id,code,name', 'cogsAccount:id,code,name', 'taxCode:id,code,name,rate'])
            ->withSum('inventoryMovements as stock_on_hand', 'quantity')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($type !== 'all', fn ($query) => $query->where('type', $type))
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->orderBy('type')
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('accounting/master-data', [
            'items' => $items,
            'summary' => [
                'total' => (clone $baseQuery)->count(),
                'products' => (clone $baseQuery)->where('type', 'product')->where('status', 'active')->count(),
                'services' => (clone $baseQuery)->where('type', 'service')->where('status', 'active')->count(),
                'inactive' => (clone $baseQuery)->where('status', 'inactive')->count(),
            ],
            'filters' => compact('search', 'type', 'status'),
            'suppliers' => Supplier::query()
                ->where('organization_id', $organizationId)
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'supplier_no', 'name']),
            'expenseAccounts' => GlAccount::query()
                ->where('organization_id', $organizationId)
                ->where('type', 'expense')
                ->where('active', true)
                ->orderBy('code')
                ->get()
                ->map(fn (GlAccount $account) => ['value' => (string) $account->id, 'label' => $account->code.' · '.$account->name]),
            'revenueAccounts' => GlAccount::query()->where('organization_id', $organizationId)->where('type', 'revenue')->where('active', true)->orderBy('code')->get()
                ->map(fn (GlAccount $account) => ['value' => (string) $account->id, 'label' => $account->code.' · '.$account->name]),
            'assetAccounts' => GlAccount::query()->where('organization_id', $organizationId)->where('type', 'asset')->where('active', true)->orderBy('code')->get()
                ->map(fn (GlAccount $account) => ['value' => (string) $account->id, 'label' => $account->code.' · '.$account->name]),
            'taxCodes' => TaxCode::query()
                ->where('organization_id', $organizationId)
                ->where('active', true)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'rate']),
            'currency' => $request->user()->organization?->base_currency_code ?? 'USD',
            'permissions' => ['manage' => $request->user()->can('accounting.manage')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('accounting.manage'), 403);
        $validated = $this->validateItem($request);
        $item = CatalogItem::query()->create([
            ...$validated,
            'track_inventory' => $validated['type'] === 'product' && ($validated['track_inventory'] ?? false),
            'organization_id' => $request->user()->organization_id,
            'code' => Str::upper($validated['code']),
            'status' => 'active',
        ]);
        $this->auditLogger->record($request, 'accounting.catalog-item-created', $item, null, $item->only(['code', 'name', 'type', 'status']));

        return back()->with('success', "{$item->name} was added to the catalogue.");
    }

    public function update(CatalogItem $catalogItem, Request $request): RedirectResponse
    {
        $this->authorizeItem($catalogItem, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $before = $catalogItem->toArray();
        $validated = $this->validateItem($request, $catalogItem);
        $catalogItem->update([...$validated, 'track_inventory' => $validated['type'] === 'product' && ($validated['track_inventory'] ?? false), 'code' => Str::upper($validated['code'])]);
        $this->auditLogger->record($request, 'accounting.catalog-item-updated', $catalogItem, $before, $catalogItem->fresh()->toArray());

        return back()->with('success', "{$catalogItem->name} was updated.");
    }

    public function updateStatus(CatalogItem $catalogItem, Request $request): RedirectResponse
    {
        $this->authorizeItem($catalogItem, $request);
        abort_unless($request->user()->can('accounting.manage'), 403);
        $validated = $request->validate(['status' => ['required', Rule::in(['active', 'inactive'])]]);
        $before = ['status' => $catalogItem->status];
        $catalogItem->update($validated);
        $this->auditLogger->record($request, 'accounting.catalog-item-status-changed', $catalogItem, $before, $validated);

        return back()->with('success', "{$catalogItem->name} is now {$catalogItem->status}.");
    }

    public function export(Request $request): StreamedResponse
    {
        $organizationId = $request->user()->organization_id;
        $items = CatalogItem::query()
            ->where('organization_id', $organizationId)
            ->with(['supplier:id,supplier_no,name', 'expenseAccount:id,code,name', 'revenueAccount:id,code,name', 'inventoryAccount:id,code,name', 'cogsAccount:id,code,name', 'taxCode:id,code,rate'])
            ->withSum('inventoryMovements as stock_on_hand', 'quantity')
            ->orderBy('code')
            ->get();

        return response()->streamDownload(function () use ($items): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['Code', 'Name', 'Type', 'Track stock', 'Stock on hand', 'Description', 'Unit', 'Default price', 'Default cost', 'Reorder level', 'Currency', 'Tax code', 'Expense account', 'Revenue account', 'Inventory account', 'Cost of sales account', 'Default supplier', 'Status']);
            foreach ($items as $item) {
                fputcsv($stream, [
                    $item->code,
                    $item->name,
                    $item->type,
                    $item->track_inventory ? 'Yes' : 'No',
                    $item->stock_on_hand,
                    $item->description,
                    $item->unit_of_measure,
                    $item->default_unit_price,
                    $item->default_cost,
                    $item->reorder_level,
                    $item->currency_code,
                    $item->taxCode?->code,
                    $item->expenseAccount ? $item->expenseAccount->code.' · '.$item->expenseAccount->name : null,
                    $item->revenueAccount ? $item->revenueAccount->code.' · '.$item->revenueAccount->name : null,
                    $item->inventoryAccount ? $item->inventoryAccount->code.' · '.$item->inventoryAccount->name : null,
                    $item->cogsAccount ? $item->cogsAccount->code.' · '.$item->cogsAccount->name : null,
                    $item->supplier ? $item->supplier->supplier_no.' · '.$item->supplier->name : null,
                    $item->status,
                ]);
            }
            fclose($stream);
        }, 'PRODUCT-SERVICE-MASTER-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function validateItem(Request $request, ?CatalogItem $item = null): array
    {
        $organizationId = $request->user()->organization_id;

        return $request->validate([
            'code' => [
                'required', 'string', 'max:40', 'regex:/^[A-Za-z0-9][A-Za-z0-9._-]*$/',
                Rule::unique('catalog_items', 'code')->where('organization_id', $organizationId)->ignore($item?->id),
            ],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['required', Rule::in(['product', 'service'])],
            'track_inventory' => ['sometimes', 'boolean'],
            'unit_of_measure' => ['required', 'string', 'max:30'],
            'default_unit_price' => ['required', 'numeric', 'min:0', 'max:99999999999999'],
            'default_cost' => ['sometimes', 'numeric', 'min:0', 'max:99999999999999'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0', 'max:99999999999999'],
            'currency_code' => ['required', 'string', 'size:3', 'uppercase', Rule::exists('currencies', 'code')],
            'default_supplier_id' => ['nullable', Rule::exists('suppliers', 'id')->where('organization_id', $organizationId)],
            'expense_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)->where('type', 'expense')],
            'revenue_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)->where('type', 'revenue')],
            'inventory_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)->where('type', 'asset')],
            'cogs_account_id' => ['nullable', Rule::exists('gl_accounts', 'id')->where('organization_id', $organizationId)->where('type', 'expense')],
            'tax_code_id' => ['nullable', Rule::exists('tax_codes', 'id')->where('organization_id', $organizationId)],
        ], [
            'code.regex' => 'Use letters, numbers, dots, hyphens or underscores only.',
            'code.unique' => 'This catalogue code is already in use.',
        ]);
    }

    private function authorizeItem(CatalogItem $item, Request $request): void
    {
        abort_unless((int) $item->organization_id === (int) $request->user()->organization_id, 404);
    }
}
