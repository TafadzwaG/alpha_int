<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashSessionCount extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_session_id',
        'currency_code',
        'denomination',
        'quantity',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'denomination' => 'decimal:4',
            'amount' => 'decimal:4',
        ];
    }

    public function cashSession()
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }
}
