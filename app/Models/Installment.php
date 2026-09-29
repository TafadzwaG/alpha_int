<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Installment extends Model
{
    use HasFactory;

    protected $fillable = [
        'allocation_id',
        'sequence_no',
        'due_date',
        'amount_due',
        'amount_paid',
        'currency_code',
        'status',
        'paid_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'paid_at' => 'datetime',
            'amount_due' => 'decimal:4',
            'amount_paid' => 'decimal:4',
        ];
    }

    public function allocation()
    {
        return $this->belongsTo(StandAllocation::class, 'allocation_id');
    }

    public function paymentAllocations()
    {
        return $this->hasMany(PaymentAllocation::class, 'installment_id');
    }

    public function reminders()
    {
        return $this->hasMany(InstallmentReminder::class, 'installment_id');
    }
}
