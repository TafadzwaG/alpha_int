<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('interaction_type', 40);
            $table->dateTime('occurred_at', 6);
            $table->text('summary');
            $table->string('outcome', 80)->nullable();
            $table->date('promise_date')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('supersedes_id')->nullable()->constrained('client_interactions')->nullOnDelete();
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['client_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_interactions');
    }
};
