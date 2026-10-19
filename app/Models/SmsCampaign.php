<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SmsCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id', 'branch_id', 'created_by', 'idempotency_key', 'name', 'message', 'audience_type',
        'filters_json', 'provider', 'status', 'recipient_count', 'sent_count',
        'failed_count', 'simulated_count', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'filters_json' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function recipients()
    {
        return $this->hasMany(SmsRecipient::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
