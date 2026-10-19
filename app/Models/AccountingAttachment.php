<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingAttachment extends Model
{
    protected $fillable = ['organization_id', 'subject_type', 'subject_id', 'original_name', 'disk', 'path', 'mime_type', 'size_bytes', 'uploaded_by'];
}
