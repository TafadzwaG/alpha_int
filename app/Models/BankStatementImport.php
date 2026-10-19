<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankStatementImport extends Model
{
    protected $fillable = ['organization_id', 'bank_account_id', 'statement_no', 'from_date', 'to_date', 'currency_code', 'original_filename', 'status', 'created_by'];

    protected function casts(): array
    {
        return ['from_date' => 'date', 'to_date' => 'date'];
    }

    public function lines()
    {
        return $this->hasMany(BankStatementLine::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }
}
