<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'gl_account_id',
        'bank_name',
        'account_name',
        'account_mask',
        'account_reference_encrypted',
        'currency_code',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function ledgerAccount()
    {
        return $this->belongsTo(GlAccount::class, 'gl_account_id');
    }
}
