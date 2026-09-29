<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InstallmentReminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'installment_id',
        'channel',
        'remind_at',
        'status',
        'sent_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function installment()
    {
        return $this->belongsTo(Installment::class, 'installment_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
