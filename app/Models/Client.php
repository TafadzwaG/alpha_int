<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'owning_branch_id',
        'client_no',
        'first_name',
        'middle_names',
        'last_name',
        'search_name',
        'national_id_hash',
        'national_id_encrypted',
        'phone_normalized',
        'sms_consent',
        'sms_consent_at',
        'sms_opted_out_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'sms_consent' => 'boolean',
            'sms_consent_at' => 'datetime',
            'sms_opted_out_at' => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function owningBranch()
    {
        return $this->belongsTo(Branch::class, 'owning_branch_id');
    }

    public function files()
    {
        return $this->hasMany(ClientFile::class, 'client_id');
    }

    public function contacts()
    {
        return $this->hasMany(ClientContact::class);
    }

    public function interactions()
    {
        return $this->hasMany(ClientInteraction::class);
    }

    public function followUpTasks()
    {
        return $this->hasMany(FollowUpTask::class);
    }

    public function promisesToPay()
    {
        return $this->hasMany(PromiseToPay::class);
    }

    public function campaignMemberships()
    {
        return $this->hasMany(CallCentreCampaignMember::class);
    }

    public function gapRegisterEntries()
    {
        return $this->hasMany(GapRegisterEntry::class);
    }
}
