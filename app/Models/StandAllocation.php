<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StandAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_file_id',
        'stand_id',
        'branch_id',
        'category',
        'allocated_at',
        'effective_price',
        'currency_code',
        'status',
        'approval_request_id',
        'created_by',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'allocated_at' => 'datetime',
            'effective_price' => 'decimal:4',
        ];
    }

    public function clientFile()
    {
        return $this->belongsTo(ClientFile::class, 'client_file_id');
    }

    public function stand()
    {
        return $this->belongsTo(Stand::class, 'stand_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function account()
    {
        return $this->hasOne(ClientAccount::class, 'allocation_id');
    }

    public function installments()
    {
        return $this->hasMany(Installment::class, 'allocation_id');
    }
}
