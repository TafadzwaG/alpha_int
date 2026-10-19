<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GapRegisterEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'client_id',
        'stand_id',
        'stand_allocation_id',
        'register_type',
        'stand_no_snapshot',
        'first_name_snapshot',
        'surname_snapshot',
        'cooperative',
        'contacts',
        'stand_size',
        'stand_price',
        'interest_amount',
        'amount_paid',
        'balance',
        'last_payment_date',
        'register_comment',
        'captured_by',
        'currency_code',
        'source_sheet',
        'source_row',
    ];

    protected function casts(): array
    {
        return [
            'stand_size' => 'decimal:4',
            'stand_price' => 'decimal:4',
            'interest_amount' => 'decimal:4',
            'amount_paid' => 'decimal:4',
            'balance' => 'decimal:4',
            'last_payment_date' => 'date',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function stand()
    {
        return $this->belongsTo(Stand::class);
    }

    public function standAllocation()
    {
        return $this->belongsTo(StandAllocation::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
