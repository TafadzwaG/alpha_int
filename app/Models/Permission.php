<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    protected $fillable = [
        'name',
        'guard_name',
        'code',
        'description',
        'risk_level',
        'active',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
