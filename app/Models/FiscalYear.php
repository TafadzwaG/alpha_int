<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FiscalYear extends Model
{
    protected $fillable = ['organization_id', 'name', 'starts_on', 'ends_on', 'status'];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date'];
    }

    public function periods()
    {
        return $this->hasMany(AccountingPeriod::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
