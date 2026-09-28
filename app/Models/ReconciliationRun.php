<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReconciliationRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'business_date',
        'run_no',
        'expected_total',
        'declared_total',
        'deposited_total',
        'variance',
        'currency_code',
        'status',
        'approval_request_id',
        'prepared_by',
        'approved_by',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'business_date' => 'date',
            'expected_total' => 'decimal:4',
            'declared_total' => 'decimal:4',
            'deposited_total' => 'decimal:4',
            'variance' => 'decimal:4',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function approvalRequest()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function preparedBy()
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items()
    {
        return $this->hasMany(ReconciliationItem::class, 'reconciliation_run_id');
    }
}
