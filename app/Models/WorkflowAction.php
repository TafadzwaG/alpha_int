<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkflowAction extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'approval_request_id',
        'approval_step_id',
        'action',
        'actor_id',
        'note',
        'metadata_json',
        'acted_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
            'acted_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function approvalStep()
    {
        return $this->belongsTo(ApprovalStep::class, 'approval_step_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
