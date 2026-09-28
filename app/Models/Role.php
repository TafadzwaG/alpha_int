<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        'organization_id',
        'name',
        'guard_name',
        'code',
        'description',
        'scope_type',
        'active',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
