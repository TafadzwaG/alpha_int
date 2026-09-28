<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StandType extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'description',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
