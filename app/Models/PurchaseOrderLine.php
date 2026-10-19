<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrderLine extends Model
{
    protected $fillable = ['purchase_order_id', 'catalog_item_id', 'gl_account_id', 'description', 'ordered_quantity', 'received_quantity', 'unit_price', 'tax_code', 'tax_rate', 'line_subtotal', 'tax_amount', 'line_total'];

    protected function casts(): array
    {
        return ['ordered_quantity' => 'decimal:4', 'received_quantity' => 'decimal:4', 'unit_price' => 'decimal:4', 'tax_rate' => 'decimal:4', 'line_subtotal' => 'decimal:4', 'tax_amount' => 'decimal:4', 'line_total' => 'decimal:4'];
    }

    public function order()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function item()
    {
        return $this->belongsTo(CatalogItem::class, 'catalog_item_id');
    }

    public function account()
    {
        return $this->belongsTo(GlAccount::class, 'gl_account_id');
    }
}
