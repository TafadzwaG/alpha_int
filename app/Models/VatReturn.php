<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VatReturn extends Model
{
    protected $fillable = ['organization_id', 'previous_return_id', 'from_date', 'to_date', 'currency_code', 'version', 'output_tax', 'input_tax', 'net_tax', 'control_balance', 'variance', 'status', 'amendment_reason', 'prepared_by', 'reviewed_by', 'approved_by', 'submitted_by', 'reviewed_at', 'approved_at', 'submitted_at'];
    protected function casts(): array { return ['from_date' => 'date', 'to_date' => 'date', 'output_tax' => 'decimal:4', 'input_tax' => 'decimal:4', 'net_tax' => 'decimal:4', 'control_balance' => 'decimal:4', 'variance' => 'decimal:4', 'reviewed_at' => 'datetime', 'approved_at' => 'datetime', 'submitted_at' => 'datetime']; }
}
