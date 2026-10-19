<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CallCentreCampaignMember extends Model
{
    use HasFactory;

    protected $fillable = ['campaign_id', 'client_id', 'assigned_to', 'last_interaction_id', 'status', 'priority'];

    public function campaign()
    {
        return $this->belongsTo(CallCentreCampaign::class, 'campaign_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function lastInteraction()
    {
        return $this->belongsTo(ClientInteraction::class, 'last_interaction_id');
    }
}
