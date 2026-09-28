<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OutboxEvent extends Model
{
    use HasFactory, HasUlids;

    public $incrementing = false;

    protected $keyType = 'string';

    public const UPDATED_AT = null;

    protected $fillable = [
        'aggregate_type',
        'aggregate_id',
        'event_type',
        'payload_json',
        'occurred_at',
        'available_at',
        'published_at',
        'attempts',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'payload_json' => 'array',
            'occurred_at' => 'datetime',
            'available_at' => 'datetime',
            'published_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function aggregate()
    {
        return $this->morphTo();
    }
}
