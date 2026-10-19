<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = ['organization_id', 'supplier_no', 'name', 'tax_number', 'email', 'phone', 'address', 'currency_code', 'payment_terms_days', 'status'];

    public function bills()
    {
        return $this->hasMany(SupplierBill::class);
    }

    public function catalogItems()
    {
        return $this->hasMany(CatalogItem::class, 'default_supplier_id');
    }
}
