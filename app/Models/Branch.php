<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $table = 'branches';

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'timezone',
        'address',
        'phone',
        'email',
        'status',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
