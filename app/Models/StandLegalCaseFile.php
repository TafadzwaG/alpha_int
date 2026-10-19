<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StandLegalCaseFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'stand_legal_case_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size_bytes',
        'uploaded_by',
    ];

    public function legalCase()
    {
        return $this->belongsTo(StandLegalCase::class, 'stand_legal_case_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
