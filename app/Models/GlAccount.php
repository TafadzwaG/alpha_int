<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlAccount extends Model
{
    protected $fillable = ['organization_id', 'parent_id', 'code', 'name', 'type', 'subtype', 'normal_balance', 'system_key', 'control_account', 'allow_manual_posting', 'active'];

    protected function casts(): array
    {
        return ['control_account' => 'boolean', 'allow_manual_posting' => 'boolean', 'active' => 'boolean'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function journalLines()
    {
        return $this->hasMany(JournalLine::class);
    }
}
