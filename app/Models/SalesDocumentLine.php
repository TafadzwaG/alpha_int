<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesDocumentLine extends Model
{
    protected $fillable = ['sales_document_id', 'catalog_item_id', 'revenue_account_id', 'description', 'quantity', 'unit_price', 'unit_cost', 'discount_rate', 'discount_amount', 'tax_code', 'tax_rate', 'line_subtotal', 'tax_amount', 'line_total'];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'unit_price' => 'decimal:4', 'unit_cost' => 'decimal:4', 'discount_rate' => 'decimal:4', 'discount_amount' => 'decimal:4', 'tax_rate' => 'decimal:4', 'line_subtotal' => 'decimal:4', 'tax_amount' => 'decimal:4', 'line_total' => 'decimal:4'];
    }

    public function document() { return $this->belongsTo(SalesDocument::class, 'sales_document_id'); }
    public function item() { return $this->belongsTo(CatalogItem::class, 'catalog_item_id'); }
}
