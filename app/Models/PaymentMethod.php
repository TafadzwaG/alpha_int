<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'requires_reference',
        'cash_equivalent',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'requires_reference' => 'boolean',
            'cash_equivalent' => 'boolean',
            'active' => 'boolean',
        ];
    }
}
