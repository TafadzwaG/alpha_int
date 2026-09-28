<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReconciliationItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'reconciliation_run_id',
        'item_type',
        'source_type',
        'source_id',
        'expected_amount',
        'actual_amount',
        'variance',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'expected_amount' => 'decimal:4',
            'actual_amount' => 'decimal:4',
            'variance' => 'decimal:4',
        ];
    }

    public function reconciliationRun()
    {
        return $this->belongsTo(ReconciliationRun::class, 'reconciliation_run_id');
    }

    public function source()
    {
        return $this->morphTo();
    }
}
