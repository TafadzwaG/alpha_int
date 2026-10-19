<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromiseToPay extends Model
{
    use HasFactory;

    protected $table = 'promises_to_pay';

    protected $fillable = [
        'client_id', 'branch_id', 'interaction_id', 'account_id', 'promised_amount',
        'currency_code', 'due_date', 'status', 'fulfilled_at', 'payment_id',
        'created_by', 'breach_notified_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'promised_amount' => 'decimal:4', 'due_date' => 'date', 'fulfilled_at' => 'datetime',
            'breach_notified_at' => 'datetime',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function interaction()
    {
        return $this->belongsTo(ClientInteraction::class);
    }

    public function account()
    {
        return $this->belongsTo(ClientAccount::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
