<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExpenseLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_id',
        'category_id',
        'description',
        'amount',
        'tax_amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'tax_amount' => 'decimal:4',
        ];
    }

    public function expense()
    {
        return $this->belongsTo(Expense::class, 'expense_id');
    }

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }
}
