<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Lab404\Impersonate\Models\Impersonate;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Impersonate, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'home_branch_id',
        'name',
        'email',
        'password',
        'mfa_state',
        'status',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function homeBranch()
    {
        return $this->belongsTo(Branch::class, 'home_branch_id');
    }

    public function branchAccess()
    {
        return $this->hasMany(UserBranchAccess::class);
    }

    public function assignedCallCentreTasks()
    {
        return $this->hasMany(FollowUpTask::class, 'assigned_to');
    }

    public function createdClientInteractions()
    {
        return $this->hasMany(ClientInteraction::class, 'created_by');
    }

    public function canImpersonate(): bool
    {
        return $this->can('phase-one.manage');
    }

    public function canBeImpersonated(): bool
    {
        return $this->status === 'active';
    }
}
