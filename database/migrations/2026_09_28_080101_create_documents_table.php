<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('owner_type', 80);
            $table->unsignedBigInteger('owner_id');
            $table->string('object_key')->unique();
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size_bytes');
            $table->string('content_hash', 64)->index();
            $table->string('malware_scan_status', 30)->default('pending');
            $table->string('retention_class', 40)->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('uploaded_at', 6);
            $table->timestamps(6);
            $table->index(['owner_type', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
