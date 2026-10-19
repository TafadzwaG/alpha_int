<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierBillLine extends Model
{
    protected $fillable = ['supplier_bill_id', 'catalog_item_id', 'gl_account_id', 'description', 'quantity', 'unit_price', 'tax_code', 'tax_rate', 'line_subtotal', 'tax_amount', 'line_total'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'unit_price' => 'decimal:4', 'tax_rate' => 'decimal:4', 'line_subtotal' => 'decimal:4', 'tax_amount' => 'decimal:4', 'line_total' => 'decimal:4'];
    }

    public function bill()
    {
        return $this->belongsTo(SupplierBill::class, 'supplier_bill_id');
    }

    public function account()
    {
        return $this->belongsTo(GlAccount::class, 'gl_account_id');
    }

    public function catalogItem()
    {
        return $this->belongsTo(CatalogItem::class);
    }
}
