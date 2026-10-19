<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserMfaChallenge extends Model
{
    protected $fillable = ['user_id', 'code_hash', 'attempts', 'expires_at', 'consumed_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'consumed_at' => 'datetime'];
    }
}
