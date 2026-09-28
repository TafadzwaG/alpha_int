<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allocation_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->constrained('stand_allocations')->restrictOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->text('reason');
            $table->foreignId('workflow_action_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('changed_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('changed_at', 6);
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['allocation_id', 'changed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allocation_status_history');
    }
};
