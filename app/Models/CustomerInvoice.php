<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerInvoice extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'client_account_id', 'accounting_dimension_id', 'account_charge_id', 'journal_entry_id', 'invoice_no', 'invoice_date', 'due_date', 'currency_code', 'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'paid_amount', 'status', 'description', 'created_by', 'posted_by', 'posted_at', 'locked_at'];

    protected function casts(): array
    {
        return ['invoice_date' => 'date', 'due_date' => 'date', 'subtotal' => 'decimal:4', 'discount_amount' => 'decimal:4', 'tax_amount' => 'decimal:4', 'total_amount' => 'decimal:4', 'paid_amount' => 'decimal:4', 'posted_at' => 'datetime', 'locked_at' => 'datetime'];
    }

    public function lines()
    {
        return $this->hasMany(CustomerInvoiceLine::class);
    }

    public function account()
    {
        return $this->belongsTo(ClientAccount::class, 'client_account_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function charge()
    {
        return $this->belongsTo(AccountCharge::class, 'account_charge_id');
    }

    public function journal()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}
