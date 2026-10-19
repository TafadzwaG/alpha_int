<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SmsRecipient extends Model
{
    use HasFactory;

    protected $fillable = [
        'sms_campaign_id', 'client_id', 'phone', 'status', 'provider_message_id',
        'provider_status', 'error_message', 'attempts', 'sent_at', 'delivered_at',
    ];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime', 'delivered_at' => 'datetime'];
    }

    public function campaign()
    {
        return $this->belongsTo(SmsCampaign::class, 'sms_campaign_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
