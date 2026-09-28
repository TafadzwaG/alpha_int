<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'setting_key',
        'value_json',
        'data_type',
        'effective_from',
        'effective_to',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'value_json' => 'array',
            'effective_from' => 'datetime',
            'effective_to' => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
