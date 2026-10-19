<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InterestPolicy extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'base_annual_rate',
        'grace_days',
        'merit_window_months',
        'merit_exemption_threshold',
        'merit_discount_threshold',
        'discounted_annual_rate',
        'minimum_overdue_balance',
        'active',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'base_annual_rate' => 'decimal:4',
            'merit_exemption_threshold' => 'decimal:2',
            'merit_discount_threshold' => 'decimal:2',
            'discounted_annual_rate' => 'decimal:4',
            'minimum_overdue_balance' => 'decimal:4',
            'active' => 'boolean',
        ];
    }
}
