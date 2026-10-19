<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StandLegalCase extends Model
{
    use HasFactory;

    public const ACTIVE_STATUSES = ['open', 'pending', 'in_court'];

    protected $fillable = [
        'organization_id',
        'stand_id',
        'case_number',
        'title',
        'case_type',
        'status',
        'priority',
        'court_name',
        'opposing_party',
        'opened_on',
        'next_hearing_on',
        'resolved_at',
        'summary',
        'created_by',
        'assigned_to',
    ];

    protected function casts(): array
    {
        return [
            'opened_on' => 'date',
            'next_hearing_on' => 'date',
            'resolved_at' => 'datetime',
        ];
    }

    public function stand()
    {
        return $this->belongsTo(Stand::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function notes()
    {
        return $this->hasMany(StandLegalCaseNote::class)->latest();
    }

    public function files()
    {
        return $this->hasMany(StandLegalCaseFile::class)->latest();
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::ACTIVE_STATUSES, true);
    }
}
