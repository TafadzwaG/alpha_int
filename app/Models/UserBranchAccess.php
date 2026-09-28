<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserBranchAccess extends Model
{
    use HasFactory;

    protected $table = 'user_branch_access';

    protected $fillable = [
        'user_id',
        'branch_id',
        'access_level',
        'valid_from',
        'valid_to',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'valid_from' => 'datetime',
            'valid_to' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
