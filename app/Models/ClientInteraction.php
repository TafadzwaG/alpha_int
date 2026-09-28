<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientInteraction extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'client_id',
        'branch_id',
        'interaction_type',
        'occurred_at',
        'summary',
        'outcome',
        'promise_date',
        'created_by',
        'supersedes_id',
    ];

    protected function casts(): array
    {
        return [
            'promise_date' => 'date',
            'occurred_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function supersedes()
    {
        return $this->belongsTo(ClientInteraction::class, 'supersedes_id');
    }
}
