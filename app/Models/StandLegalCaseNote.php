<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StandLegalCaseNote extends Model
{
    use HasFactory;

    protected $fillable = ['stand_legal_case_id', 'body', 'created_by'];

    public function legalCase()
    {
        return $this->belongsTo(StandLegalCase::class, 'stand_legal_case_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
