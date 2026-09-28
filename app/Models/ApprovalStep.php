<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApprovalStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'approval_request_id',
        'sequence_no',
        'required_role_id',
        'threshold_min',
        'threshold_currency',
        'status',
        'assigned_user_id',
        'completed_at',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'threshold_min' => 'decimal:4',
        ];
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function requiredRole()
    {
        return $this->belongsTo(Role::class, 'required_role_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
}
