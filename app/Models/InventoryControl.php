<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryControl extends Model
{
    protected $fillable = ['organization_id', 'branch_id', 'journal_entry_id', 'control_no', 'control_type', 'control_date', 'status', 'reason', 'created_by', 'approved_by', 'posted_by', 'approved_at', 'posted_at'];
    protected function casts(): array { return ['control_date' => 'date', 'approved_at' => 'datetime', 'posted_at' => 'datetime']; }
    public function lines() { return $this->hasMany(InventoryControlLine::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
}
