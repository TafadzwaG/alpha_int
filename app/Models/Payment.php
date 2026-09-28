<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory, HasPublicId;

    protected $fillable = [
        'account_id',
        'branch_id',
        'cash_session_id',
        'amount',
        'currency_code',
        'method_id',
        'external_reference',
        'received_at',
        'status',
        'made_by',
        'approval_request_id',
        'approved_by',
        'approved_at',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'approved_at' => 'datetime',
            'amount' => 'decimal:4',
        ];
    }

    public function account()
    {
        return $this->belongsTo(ClientAccount::class, 'account_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function cashSession()
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function method()
    {
        return $this->belongsTo(PaymentMethod::class, 'method_id');
    }

    public function maker()
    {
        return $this->belongsTo(User::class, 'made_by');
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function allocations()
    {
        return $this->hasMany(PaymentAllocation::class, 'payment_id');
    }

    public function receipt()
    {
        return $this->hasOne(Receipt::class, 'payment_id');
    }
}
