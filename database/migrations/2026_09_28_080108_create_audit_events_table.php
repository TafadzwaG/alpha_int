<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type', 100);
            $table->string('subject_type', 80);
            $table->unsignedBigInteger('subject_id');
            $table->json('before_json')->nullable();
            $table->json('after_json')->nullable();
            $table->string('ip_hash', 64)->nullable();
            $table->string('user_agent_hash', 64)->nullable();
            $table->dateTime('occurred_at', 6);
            $table->string('previous_hash', 64)->nullable();
            $table->string('event_hash', 64)->unique();
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['subject_type', 'subject_id', 'occurred_at'], 'audit_events_subject_index');
            $table->index(['actor_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
    }
};
