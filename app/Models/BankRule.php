<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankRule extends Model
{
    protected $fillable = ['organization_id', 'bank_account_id', 'name', 'match_operator', 'pattern', 'counter_account_id', 'accounting_dimension_id', 'priority', 'active'];
    protected function casts(): array { return ['active' => 'boolean']; }
    public function counterAccount() { return $this->belongsTo(GlAccount::class, 'counter_account_id'); }
}
