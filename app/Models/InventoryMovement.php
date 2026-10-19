<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'catalog_item_id', 'movement_type', 'quantity', 'unit_cost', 'source_type', 'source_id', 'reference', 'occurred_at', 'created_by'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'unit_cost' => 'decimal:4', 'occurred_at' => 'datetime'];
    }

    public function item()
    {
        return $this->belongsTo(CatalogItem::class, 'catalog_item_id');
    }
}
