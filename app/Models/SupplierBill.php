<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierBill extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'supplier_id', 'accounting_dimension_id', 'purchase_order_id', 'goods_receipt_id', 'journal_entry_id', 'bill_no', 'supplier_reference', 'bill_date', 'due_date', 'currency_code', 'subtotal', 'tax_amount', 'total_amount', 'paid_amount', 'status', 'description', 'created_by', 'posted_by', 'posted_at', 'locked_at'];

    protected function casts(): array
    {
        return ['bill_date' => 'date', 'due_date' => 'date', 'subtotal' => 'decimal:4', 'tax_amount' => 'decimal:4', 'total_amount' => 'decimal:4', 'paid_amount' => 'decimal:4', 'posted_at' => 'datetime', 'locked_at' => 'datetime'];
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function lines()
    {
        return $this->hasMany(SupplierBillLine::class);
    }

    public function payments()
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function journal()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function goodsReceipt()
    {
        return $this->belongsTo(GoodsReceipt::class);
    }
}
