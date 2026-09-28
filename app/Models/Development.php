<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Development extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'location',
        'description',
        'status',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function phases()
    {
        return $this->hasMany(DevelopmentPhase::class, 'development_id');
    }
}
