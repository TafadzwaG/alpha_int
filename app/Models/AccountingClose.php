<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingClose extends Model
{
    protected $fillable = ['organization_id', 'fiscal_year_id', 'accounting_period_id', 'retained_earnings_journal_id', 'opening_balance_journal_id', 'close_type', 'reference', 'status', 'reopen_reason', 'opening_balances_json', 'prepared_by', 'reviewed_by', 'approved_by', 'reopened_by', 'reopen_approved_by', 'reviewed_at', 'approved_at', 'reopened_at', 'reopen_approved_at'];

    protected function casts(): array
    {
        return ['opening_balances_json' => 'array', 'reviewed_at' => 'datetime', 'approved_at' => 'datetime', 'reopened_at' => 'datetime', 'reopen_approved_at' => 'datetime'];
    }

    public function tasks()
    {
        return $this->hasMany(AccountingCloseTask::class);
    }

    public function period()
    {
        return $this->belongsTo(AccountingPeriod::class, 'accounting_period_id');
    }

    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }
}
