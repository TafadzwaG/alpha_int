<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxCode extends Model
{
    protected $fillable = ['organization_id', 'code', 'name', 'rate', 'type', 'input_account_id', 'output_account_id', 'active'];

    protected function casts(): array
    {
        return ['rate' => 'decimal:4', 'active' => 'boolean'];
    }

    public function inputAccount()
    {
        return $this->belongsTo(GlAccount::class, 'input_account_id');
    }

    public function outputAccount()
    {
        return $this->belongsTo(GlAccount::class, 'output_account_id');
    }
}
