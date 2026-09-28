<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AllocationStatusHistory extends Model
{
    use HasFactory;

    protected $table = 'allocation_status_history';

    public const UPDATED_AT = null;

    protected $fillable = [
        'allocation_id',
        'from_status',
        'to_status',
        'reason',
        'workflow_action_id',
        'changed_by',
        'changed_at',
    ];

    protected function casts(): array
    {
        return [
            'changed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function allocation()
    {
        return $this->belongsTo(StandAllocation::class, 'allocation_id');
    }

    public function workflowAction()
    {
        return $this->belongsTo(WorkflowAction::class, 'workflow_action_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
