<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'charge_id',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
        ];
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function charge()
    {
        return $this->belongsTo(AccountCharge::class, 'charge_id');
    }
}
