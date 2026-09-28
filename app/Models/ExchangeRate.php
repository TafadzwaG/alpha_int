<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'rate_date',
        'base_currency',
        'quote_currency',
        'rate',
        'source',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'rate_date' => 'date',
            'approved_at' => 'datetime',
            'rate' => 'decimal:8',
        ];
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
