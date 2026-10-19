<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankStatementLine extends Model
{
    protected $fillable = ['bank_statement_import_id', 'transaction_date', 'reference', 'description', 'amount', 'balance', 'line_hash', 'match_type', 'match_id', 'matched_at', 'matched_by'];

    protected function casts(): array
    {
        return ['transaction_date' => 'date', 'amount' => 'decimal:4', 'balance' => 'decimal:4', 'matched_at' => 'datetime'];
    }

    public function statement()
    {
        return $this->belongsTo(BankStatementImport::class, 'bank_statement_import_id');
    }
}
