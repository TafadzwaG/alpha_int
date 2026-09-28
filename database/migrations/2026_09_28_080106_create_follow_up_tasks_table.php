<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follow_up_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->foreignId('source_interaction_id')->nullable()->constrained('client_interactions')->nullOnDelete();
            $table->foreignId('assigned_to')->constrained('users')->restrictOnDelete();
            $table->dateTime('due_at', 6);
            $table->string('priority', 20)->default('normal');
            $table->string('status', 30)->default('open');
            $table->dateTime('completed_at', 6)->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps(6);
            $table->index(['assigned_to', 'status', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follow_up_tasks');
    }
};
