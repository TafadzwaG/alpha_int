<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CallCentreCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id', 'branch_id', 'name', 'campaign_type', 'aging_bucket',
        'description', 'status', 'starts_on', 'ends_on', 'created_by',
    ];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date'];
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

    public function members()
    {
        return $this->hasMany(CallCentreCampaignMember::class, 'campaign_id');
    }

    public function interactions()
    {
        return $this->hasMany(ClientInteraction::class, 'campaign_id');
    }
}
