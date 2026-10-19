<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'supplier_id', 'po_no', 'order_date', 'expected_date', 'currency_code', 'subtotal', 'tax_amount', 'total_amount', 'status', 'notes', 'created_by', 'approved_by', 'approved_at'];

    protected function casts(): array
    {
        return ['order_date' => 'date', 'expected_date' => 'date', 'subtotal' => 'decimal:4', 'tax_amount' => 'decimal:4', 'total_amount' => 'decimal:4', 'approved_at' => 'datetime'];
    }

    public function lines()
    {
        return $this->hasMany(PurchaseOrderLine::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function goodsReceipts()
    {
        return $this->hasMany(GoodsReceipt::class);
    }

    public function bills()
    {
        return $this->hasMany(SupplierBill::class);
    }
}
