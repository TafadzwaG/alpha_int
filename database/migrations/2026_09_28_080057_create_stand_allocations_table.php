<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stand_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_file_id')->constrained()->restrictOnDelete();
            $table->foreignId('stand_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('category', 40);
            $table->dateTime('allocated_at', 6)->nullable();
            $table->decimal('effective_price', 19, 4)->nullable();
            $table->char('currency_code', 3)->nullable();
            $table->string('status', 30)->default('pending');
            $table->foreignId('approval_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->index(['stand_id', 'status']);
            $table->index(['client_file_id', 'status']);
            $table->foreign('currency_code')->references('code')->on('currencies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stand_allocations');
    }
};
