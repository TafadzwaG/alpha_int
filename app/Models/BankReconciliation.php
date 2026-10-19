<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankReconciliation extends Model
{
    protected $fillable = ['organization_id', 'bank_account_id', 'bank_statement_import_id', 'reference', 'from_date', 'to_date', 'opening_statement_balance', 'closing_statement_balance', 'ledger_closing_balance', 'difference', 'status', 'review_note', 'prepared_by', 'reviewed_by', 'approved_by', 'reviewed_at', 'approved_at'];
    protected function casts(): array { return ['from_date' => 'date', 'to_date' => 'date', 'opening_statement_balance' => 'decimal:4', 'closing_statement_balance' => 'decimal:4', 'ledger_closing_balance' => 'decimal:4', 'difference' => 'decimal:4', 'reviewed_at' => 'datetime', 'approved_at' => 'datetime']; }
    public function items() { return $this->hasMany(BankReconciliationItem::class); }
    public function bankAccount() { return $this->belongsTo(BankAccount::class); }
    public function statement() { return $this->belongsTo(BankStatementImport::class, 'bank_statement_import_id'); }
}
