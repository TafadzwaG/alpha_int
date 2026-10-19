<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierPayment extends Model
{
    protected $fillable = ['supplier_bill_id', 'bank_account_id', 'journal_entry_id', 'payment_date', 'amount', 'currency_code', 'reference', 'created_by'];

    protected function casts(): array
    {
        return ['payment_date' => 'date', 'amount' => 'decimal:4'];
    }

    public function bill()
    {
        return $this->belongsTo(SupplierBill::class, 'supplier_bill_id');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function journal()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}
