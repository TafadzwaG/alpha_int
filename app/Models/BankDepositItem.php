<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankDepositItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_deposit_id',
        'source_type',
        'source_id',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
        ];
    }

    public function bankDeposit()
    {
        return $this->belongsTo(BankDeposit::class, 'bank_deposit_id');
    }

    public function source()
    {
        return $this->morphTo();
    }
}
