<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingApprovalLimit extends Model
{
    protected $fillable = ['organization_id', 'user_id', 'role_name', 'transaction_type', 'minimum_amount', 'maximum_amount', 'active'];
    protected function casts(): array { return ['minimum_amount' => 'decimal:4', 'maximum_amount' => 'decimal:4', 'active' => 'boolean']; }
}
