<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankReconciliationItem extends Model
{
    protected $fillable = ['bank_reconciliation_id', 'bank_statement_line_id', 'journal_entry_id', 'status', 'resolution_note', 'matched_by', 'matched_at'];
    protected function casts(): array { return ['matched_at' => 'datetime']; }
    public function bankReconciliation() { return $this->belongsTo(BankReconciliation::class); }
    public function statementLine() { return $this->belongsTo(BankStatementLine::class, 'bank_statement_line_id'); }
    public function journal() { return $this->belongsTo(JournalEntry::class, 'journal_entry_id'); }
}
