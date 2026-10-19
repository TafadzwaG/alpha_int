<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CatalogItem extends Model
{
    protected $fillable = [
        'organization_id',
        'default_supplier_id',
        'expense_account_id',
        'revenue_account_id',
        'inventory_account_id',
        'cogs_account_id',
        'tax_code_id',
        'code',
        'name',
        'description',
        'type',
        'track_inventory',
        'unit_of_measure',
        'default_unit_price',
        'default_cost',
        'average_cost',
        'reorder_level',
        'currency_code',
        'status',
    ];

    protected function casts(): array
    {
        return ['track_inventory' => 'boolean', 'default_unit_price' => 'decimal:4', 'default_cost' => 'decimal:4', 'average_cost' => 'decimal:4', 'reorder_level' => 'decimal:4'];
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'default_supplier_id');
    }

    public function expenseAccount()
    {
        return $this->belongsTo(GlAccount::class, 'expense_account_id');
    }

    public function taxCode()
    {
        return $this->belongsTo(TaxCode::class, 'tax_code_id');
    }

    public function revenueAccount()
    {
        return $this->belongsTo(GlAccount::class, 'revenue_account_id');
    }

    public function inventoryAccount()
    {
        return $this->belongsTo(GlAccount::class, 'inventory_account_id');
    }

    public function cogsAccount()
    {
        return $this->belongsTo(GlAccount::class, 'cogs_account_id');
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function billLines()
    {
        return $this->hasMany(SupplierBillLine::class);
    }
}
