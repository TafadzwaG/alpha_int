<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AllocationDispute extends Model
{
    use HasFactory;

    protected $fillable = [
        'allocation_id',
        'dispute_type',
        'opened_at',
        'description',
        'resolution',
        'resolved_at',
        'status',
        'approval_request_id',
        'opened_by',
        'resolved_by',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function allocation()
    {
        return $this->belongsTo(StandAllocation::class, 'allocation_id');
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function openedBy()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
