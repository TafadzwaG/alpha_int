<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingCloseTask extends Model
{
    protected $fillable = ['accounting_close_id', 'task_key', 'label', 'status', 'evidence', 'completed_by', 'completed_at'];
    protected function casts(): array { return ['completed_at' => 'datetime']; }
}
