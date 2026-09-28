<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Receipt extends Model
{
    use HasFactory, HasPublicId;

    protected $fillable = [
        'organization_id',
        'payment_id',
        'receipt_no',
        'issued_at',
        'pdf_object_key',
        'content_hash',
        'qr_token_hash',
        'snapshot_json',
        'issued_by',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_json' => 'array',
            'issued_at' => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
