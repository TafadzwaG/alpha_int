<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'accounting_period_id', 'journal_no', 'journal_type', 'entry_date', 'reference', 'description', 'currency_code', 'exchange_rate', 'status', 'source_type', 'source_id', 'reversal_of_id', 'created_by', 'submitted_by', 'approved_by', 'posted_by', 'reversed_by', 'posted_at', 'submitted_at', 'approved_at', 'locked_at', 'reversed_at'];

    protected function casts(): array
    {
        return ['entry_date' => 'date', 'exchange_rate' => 'decimal:8', 'posted_at' => 'datetime', 'submitted_at' => 'datetime', 'approved_at' => 'datetime', 'locked_at' => 'datetime', 'reversed_at' => 'datetime'];
    }

    public function lines()
    {
        return $this->hasMany(JournalLine::class)->orderBy('line_number');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function period()
    {
        return $this->belongsTo(AccountingPeriod::class, 'accounting_period_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function reversalOf()
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }
}
