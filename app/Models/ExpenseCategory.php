<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExpenseCategory extends Model
{
    use HasFactory;

    protected $table = 'expense_categories';

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'description',
        'approval_threshold',
        'policy_currency',
        'active',
        'effective_from',
        'effective_to',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'effective_from' => 'datetime',
            'effective_to' => 'datetime',
            'approval_threshold' => 'decimal:4',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
