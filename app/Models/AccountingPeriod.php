<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingPeriod extends Model
{
    protected $fillable = ['fiscal_year_id', 'period_number', 'name', 'starts_on', 'ends_on', 'status', 'closed_at', 'closed_by'];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date', 'closed_at' => 'datetime'];
    }

    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function closer()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
