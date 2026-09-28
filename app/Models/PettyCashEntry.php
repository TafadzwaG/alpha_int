<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PettyCashEntry extends Model
{
    use HasFactory;

    protected $table = 'petty_cash_entries';

    public const UPDATED_AT = null;

    protected $fillable = [
        'branch_id',
        'cash_session_id',
        'expense_id',
        'entry_type',
        'amount',
        'currency_code',
        'posted_at',
        'posted_by',
    ];

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'created_at' => 'datetime',
            'amount' => 'decimal:4',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function cashSession()
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function expense()
    {
        return $this->belongsTo(Expense::class, 'expense_id');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
