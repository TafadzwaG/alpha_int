<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierReconciliationLine extends Model
{
    protected $fillable = ['supplier_reconciliation_id', 'transaction_date', 'transaction_type', 'reference', 'description', 'amount', 'line_hash', 'match_status', 'match_type', 'match_id', 'resolution_note', 'matched_by', 'matched_at'];

    protected function casts(): array
    {
        return ['transaction_date' => 'date', 'amount' => 'decimal:4', 'matched_at' => 'datetime'];
    }

    public function reconciliation()
    {
        return $this->belongsTo(SupplierReconciliation::class, 'supplier_reconciliation_id');
    }
}
