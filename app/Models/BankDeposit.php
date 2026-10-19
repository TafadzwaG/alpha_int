<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankDeposit extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'bank_account_id',
        'journal_entry_id',
        'deposit_date',
        'amount',
        'currency_code',
        'slip_document_id',
        'reference',
        'status',
        'deposited_by',
        'approved_by',
        'cleared_at',
    ];

    protected function casts(): array
    {
        return [
            'deposit_date' => 'date',
            'cleared_at' => 'datetime',
            'amount' => 'decimal:4',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function slipDocument()
    {
        return $this->belongsTo(Document::class, 'slip_document_id');
    }

    public function depositedBy()
    {
        return $this->belongsTo(User::class, 'deposited_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items()
    {
        return $this->hasMany(BankDepositItem::class, 'bank_deposit_id');
    }

    public function journal()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}
