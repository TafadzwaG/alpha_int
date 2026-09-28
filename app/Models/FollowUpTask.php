<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FollowUpTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'source_interaction_id',
        'assigned_to',
        'due_at',
        'priority',
        'status',
        'completed_at',
        'completed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function sourceInteraction()
    {
        return $this->belongsTo(ClientInteraction::class, 'source_interaction_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
