<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditEvent extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'actor_id',
        'event_type',
        'subject_type',
        'subject_id',
        'before_json',
        'after_json',
        'ip_hash',
        'user_agent_hash',
        'occurred_at',
        'previous_hash',
        'event_hash',
    ];

    protected function casts(): array
    {
        return [
            'before_json' => 'array',
            'after_json' => 'array',
            'occurred_at' => 'datetime',
            'created_at' => 'datetime',
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

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function subject()
    {
        return $this->morphTo();
    }
}
