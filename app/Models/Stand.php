<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stand extends Model
{
    use HasFactory;

    protected $fillable = [
        'phase_id',
        'stand_type_id',
        'stand_no',
        'area_sqm',
        'list_price',
        'currency_code',
        'physical_status',
        'survey_reference',
        'geo_json',
    ];

    protected function casts(): array
    {
        return [
            'geo_json' => 'array',
            'area_sqm' => 'decimal:2',
            'list_price' => 'decimal:4',
        ];
    }

    public function phase()
    {
        return $this->belongsTo(DevelopmentPhase::class, 'phase_id');
    }

    public function standType()
    {
        return $this->belongsTo(StandType::class, 'stand_type_id');
    }

    public function allocations()
    {
        return $this->hasMany(StandAllocation::class, 'stand_id');
    }
}
