<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('payment_id')->unique()->constrained()->restrictOnDelete();
            $table->string('receipt_no', 80);
            $table->dateTime('issued_at', 6);
            $table->string('pdf_object_key')->nullable();
            $table->string('content_hash', 64);
            $table->string('qr_token_hash', 64);
            $table->json('snapshot_json');
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['organization_id', 'receipt_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
