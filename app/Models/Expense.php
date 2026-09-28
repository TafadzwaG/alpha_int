<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'expense_no',
        'payee',
        'currency_code',
        'total_amount',
        'purpose',
        'incurred_at',
        'status',
        'made_by',
        'approval_request_id',
        'approved_by',
        'approved_at',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'incurred_at' => 'datetime',
            'approved_at' => 'datetime',
            'total_amount' => 'decimal:4',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function maker()
    {
        return $this->belongsTo(User::class, 'made_by');
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function lines()
    {
        return $this->hasMany(ExpenseLine::class, 'expense_id');
    }

    public function pettyCashEntries()
    {
        return $this->hasMany(PettyCashEntry::class, 'expense_id');
    }
}
