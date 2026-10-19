<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoodsReceiptLine extends Model
{
    protected $fillable = ['goods_receipt_id', 'purchase_order_line_id', 'catalog_item_id', 'quantity', 'unit_cost'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'unit_cost' => 'decimal:4'];
    }

    public function receipt()
    {
        return $this->belongsTo(GoodsReceipt::class, 'goods_receipt_id');
    }
}
