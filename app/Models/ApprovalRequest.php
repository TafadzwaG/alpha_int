<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApprovalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'subject_type',
        'subject_id',
        'workflow_type',
        'current_stage',
        'status',
        'maker_id',
        'submitted_at',
        'completed_at',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function maker()
    {
        return $this->belongsTo(User::class, 'maker_id');
    }

    public function subject()
    {
        return $this->morphTo();
    }

    public function steps()
    {
        return $this->hasMany(ApprovalStep::class, 'approval_request_id')->orderBy('sequence_no');
    }

    public function actions()
    {
        return $this->hasMany(WorkflowAction::class, 'approval_request_id')->orderByDesc('acted_at');
    }
}
