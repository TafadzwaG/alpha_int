<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierReconciliation extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'supplier_id', 'statement_no', 'statement_date', 'from_date', 'to_date', 'currency_code', 'opening_balance', 'statement_balance', 'ledger_balance', 'variance', 'status', 'original_filename', 'notes', 'prepared_by', 'approved_by', 'approved_at'];

    protected function casts(): array
    {
        return ['statement_date' => 'date', 'from_date' => 'date', 'to_date' => 'date', 'opening_balance' => 'decimal:4', 'statement_balance' => 'decimal:4', 'ledger_balance' => 'decimal:4', 'variance' => 'decimal:4', 'approved_at' => 'datetime'];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SupplierReconciliationLine::class);
    }

    public function preparer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
