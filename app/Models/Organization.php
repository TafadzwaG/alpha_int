<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'legal_name',
        'trading_name',
        'registration_no',
        'base_currency_code',
        'timezone',
        'status',
    ];
}
