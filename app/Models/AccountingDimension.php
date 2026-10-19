<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingDimension extends Model
{
    protected $fillable = ['organization_id', 'kind', 'code', 'name', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
