<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentSequence extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'document_type',
        'period_key',
        'prefix',
        'next_value',
        'padding',
        'lock_version',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
