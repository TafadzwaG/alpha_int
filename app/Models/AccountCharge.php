<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountCharge extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'charge_type',
        'description',
        'amount',
        'currency_code',
        'due_date',
        'approval_request_id',
        'status',
        'posted_at',
        'created_by',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'posted_at' => 'datetime',
            'amount' => 'decimal:4',
        ];
    }

    public function account()
    {
        return $this->belongsTo(ClientAccount::class, 'account_id');
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paymentAllocations()
    {
        return $this->hasMany(PaymentAllocation::class, 'charge_id');
    }
}
