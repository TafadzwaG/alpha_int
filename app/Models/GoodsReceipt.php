<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoodsReceipt extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'supplier_id', 'purchase_order_id', 'receipt_no', 'received_date', 'supplier_reference', 'status', 'created_by'];

    protected function casts(): array
    {
        return ['received_date' => 'date'];
    }

    public function lines()
    {
        return $this->hasMany(GoodsReceiptLine::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
}
