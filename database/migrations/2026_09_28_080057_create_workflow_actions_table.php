<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained()->restrictOnDelete();
            $table->foreignId('approval_step_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 30);
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->text('note')->nullable();
            $table->json('metadata_json')->nullable();
            $table->dateTime('acted_at', 6);
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['approval_request_id', 'acted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_actions');
    }
};
