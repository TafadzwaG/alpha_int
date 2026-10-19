<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalLine extends Model
{
    protected $fillable = ['journal_entry_id', 'gl_account_id', 'branch_id', 'client_account_id', 'accounting_dimension_id', 'line_number', 'description', 'debit', 'credit', 'base_debit', 'base_credit', 'tax_code'];

    protected function casts(): array
    {
        return ['debit' => 'decimal:4', 'credit' => 'decimal:4', 'base_debit' => 'decimal:4', 'base_credit' => 'decimal:4'];
    }

    public function journal()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function account()
    {
        return $this->belongsTo(GlAccount::class, 'gl_account_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function clientAccount()
    {
        return $this->belongsTo(ClientAccount::class);
    }

    public function dimension()
    {
        return $this->belongsTo(AccountingDimension::class, 'accounting_dimension_id');
    }
}
