<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_reversals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->unique()->constrained()->restrictOnDelete();
            $table->text('reason');
            $table->foreignId('approval_request_id')->constrained()->restrictOnDelete();
            $table->dateTime('reversed_at', 6)->nullable();
            $table->string('reversal_receipt_no', 80)->nullable();
            $table->string('status', 30)->default('pending');
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('reversed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_reversals');
    }
};
