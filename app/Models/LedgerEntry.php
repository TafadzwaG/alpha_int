<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LedgerEntry extends Model
{
    use HasFactory;

    protected $table = 'ledger_entries';

    public const UPDATED_AT = null;

    protected $fillable = [
        'account_id',
        'branch_id',
        'posting_date',
        'entry_sequence',
        'entry_type',
        'debit',
        'credit',
        'currency_code',
        'source_type',
        'source_id',
        'description',
        'posted_at',
        'posted_by',
    ];

    protected function casts(): array
    {
        return [
            'posting_date' => 'date',
            'posted_at' => 'datetime',
            'created_at' => 'datetime',
            'debit' => 'decimal:4',
            'credit' => 'decimal:4',
        ];
    }

    public function account()
    {
        return $this->belongsTo(ClientAccount::class, 'account_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function source()
    {
        return $this->morphTo();
    }
}
