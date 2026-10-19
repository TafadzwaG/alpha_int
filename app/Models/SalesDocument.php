<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesDocument extends Model
{
    public const TYPES = ['quotation', 'sales_order', 'delivery_note', 'invoice', 'credit_note', 'debit_note', 'sales_return', 'refund'];
    public const POSTING_TYPES = ['invoice', 'credit_note', 'debit_note', 'sales_return', 'refund'];

    protected $fillable = ['organization_id', 'branch_id', 'client_account_id', 'parent_id', 'journal_entry_id', 'account_charge_id', 'accounting_dimension_id', 'document_type', 'document_no', 'document_date', 'due_date', 'currency_code', 'exchange_rate', 'subtotal', 'line_discount_total', 'document_discount_rate', 'document_discount_amount', 'tax_amount', 'total_amount', 'status', 'description', 'is_recurring', 'recurrence_pattern', 'next_run_on', 'created_by', 'submitted_by', 'approved_by', 'posted_by', 'submitted_at', 'approved_at', 'posted_at'];

    protected function casts(): array
    {
        return ['document_date' => 'date', 'due_date' => 'date', 'next_run_on' => 'date', 'exchange_rate' => 'decimal:8', 'subtotal' => 'decimal:4', 'line_discount_total' => 'decimal:4', 'document_discount_rate' => 'decimal:4', 'document_discount_amount' => 'decimal:4', 'tax_amount' => 'decimal:4', 'total_amount' => 'decimal:4', 'is_recurring' => 'boolean', 'submitted_at' => 'datetime', 'approved_at' => 'datetime', 'posted_at' => 'datetime'];
    }

    public function lines() { return $this->hasMany(SalesDocumentLine::class); }
    public function account() { return $this->belongsTo(ClientAccount::class, 'client_account_id'); }
    public function branch() { return $this->belongsTo(Branch::class); }
    public function parent() { return $this->belongsTo(self::class, 'parent_id'); }
    public function journal() { return $this->belongsTo(JournalEntry::class, 'journal_entry_id'); }
    public function dimension() { return $this->belongsTo(AccountingDimension::class, 'accounting_dimension_id'); }
}
