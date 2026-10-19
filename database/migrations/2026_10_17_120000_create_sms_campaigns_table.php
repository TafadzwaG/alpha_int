<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('name');
            $table->text('message');
            $table->string('audience_type', 20);
            $table->json('filters_json')->nullable();
            $table->string('provider', 30)->default('log');
            $table->string('status', 30)->default('queued');
            $table->unsignedInteger('recipient_count')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->unsignedInteger('simulated_count')->default(0);
            $table->timestamp('completed_at', 6)->nullable();
            $table->timestamps(6);
            $table->index(['organization_id', 'status', 'created_at']);
        });

        Schema::create('sms_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sms_campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->string('phone', 40);
            $table->string('status', 30)->default('queued');
            $table->string('provider_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('sent_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['sms_campaign_id', 'client_id']);
            $table->index(['sms_campaign_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_recipients');
        Schema::dropIfExists('sms_campaigns');
    }
};
