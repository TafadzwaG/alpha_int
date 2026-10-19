<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InterestExemption extends Model
{
    protected $fillable = [
        'client_account_id',
        'starts_on',
        'ends_on',
        'rate_override',
        'reason',
        'status',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'rate_override' => 'decimal:4',
        ];
    }

    public function account()
    {
        return $this->belongsTo(ClientAccount::class, 'client_account_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
