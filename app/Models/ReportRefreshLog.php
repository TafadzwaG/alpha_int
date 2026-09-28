<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReportRefreshLog extends Model
{
    use HasFactory;

    protected $table = 'report_refresh_log';

    protected $fillable = [
        'dataset_name',
        'started_at',
        'completed_at',
        'watermark_from',
        'watermark_to',
        'row_count',
        'status',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'watermark_from' => 'datetime',
            'watermark_to' => 'datetime',
        ];
    }
}
