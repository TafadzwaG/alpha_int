<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DevelopmentPhase extends Model
{
    use HasFactory;

    protected $fillable = [
        'development_id',
        'code',
        'name',
        'survey_status',
        'planned_completion_date',
    ];

    protected function casts(): array
    {
        return [
            'planned_completion_date' => 'date',
        ];
    }

    public function development()
    {
        return $this->belongsTo(Development::class, 'development_id');
    }

    public function stands()
    {
        return $this->hasMany(Stand::class, 'phase_id');
    }
}
