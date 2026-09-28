<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentReversal extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'reason',
        'approval_request_id',
        'reversed_at',
        'reversal_receipt_no',
        'status',
        'requested_by',
        'reversed_by',
    ];

    protected function casts(): array
    {
        return [
            'reversed_at' => 'datetime',
        ];
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reversedBy()
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }
}
