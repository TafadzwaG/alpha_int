<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allocation_disputes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->constrained('stand_allocations')->restrictOnDelete();
            $table->string('dispute_type', 50);
            $table->dateTime('opened_at', 6);
            $table->text('description')->nullable();
            $table->text('resolution')->nullable();
            $table->dateTime('resolved_at', 6)->nullable();
            $table->string('status', 30)->default('open');
            $table->foreignId('approval_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->index(['allocation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allocation_disputes');
    }
};
