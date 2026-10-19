<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryControlLine extends Model
{
    protected $fillable = ['inventory_control_id', 'catalog_item_id', 'system_quantity', 'counted_quantity', 'quantity_delta', 'unit_cost', 'value_delta', 'counter_account_id', 'note'];
    protected function casts(): array { return ['system_quantity' => 'decimal:4', 'counted_quantity' => 'decimal:4', 'quantity_delta' => 'decimal:4', 'unit_cost' => 'decimal:4', 'value_delta' => 'decimal:4']; }
    public function item() { return $this->belongsTo(CatalogItem::class, 'catalog_item_id'); }
}
