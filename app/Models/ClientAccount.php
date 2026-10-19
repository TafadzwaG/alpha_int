<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_file_id',
        'allocation_id',
        'account_no',
        'currency_code',
        'opened_at',
        'closed_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function clientFile()
    {
        return $this->belongsTo(ClientFile::class, 'client_file_id');
    }

    public function allocation()
    {
        return $this->belongsTo(StandAllocation::class, 'allocation_id');
    }

    public function charges()
    {
        return $this->hasMany(AccountCharge::class, 'account_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'account_id');
    }

    public function interestExemptions()
    {
        return $this->hasMany(InterestExemption::class, 'client_account_id');
    }
}
