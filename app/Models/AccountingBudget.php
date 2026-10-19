<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingBudget extends Model
{
    protected $fillable = ['organization_id', 'fiscal_year_id', 'accounting_dimension_id', 'gl_account_id', 'period_number', 'amount', 'warning_threshold', 'require_approval', 'created_by'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:4', 'warning_threshold' => 'decimal:2', 'require_approval' => 'boolean'];
    }

    public function account() { return $this->belongsTo(GlAccount::class, 'gl_account_id'); }
    public function dimension() { return $this->belongsTo(AccountingDimension::class, 'accounting_dimension_id'); }
    public function fiscalYear() { return $this->belongsTo(FiscalYear::class); }
}
