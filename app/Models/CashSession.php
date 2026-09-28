<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'cashier_id',
        'opened_at',
        'closed_at',
        'opening_float',
        'expected_cash',
        'declared_cash',
        'currency_code',
        'status',
        'closed_by',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_float' => 'decimal:4',
            'expected_cash' => 'decimal:4',
            'declared_cash' => 'decimal:4',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'cash_session_id');
    }

    public function counts()
    {
        return $this->hasMany(CashSessionCount::class, 'cash_session_id');
    }
}
