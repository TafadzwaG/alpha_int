<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outbox_events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('aggregate_type', 80);
            $table->unsignedBigInteger('aggregate_id');
            $table->string('event_type', 120);
            $table->json('payload_json');
            $table->dateTime('occurred_at', 6);
            $table->dateTime('available_at', 6)->nullable();
            $table->dateTime('published_at', 6)->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['published_at', 'available_at', 'attempts']);
            $table->index(['aggregate_type', 'aggregate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbox_events');
    }
};
