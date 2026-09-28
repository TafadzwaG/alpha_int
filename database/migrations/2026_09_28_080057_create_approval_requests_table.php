<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('subject_type', 80);
            $table->unsignedBigInteger('subject_id');
            $table->string('workflow_type', 60);
            $table->unsignedSmallInteger('current_stage')->default(1);
            $table->string('status', 30)->default('draft');
            $table->foreignId('maker_id')->constrained('users')->restrictOnDelete();
            $table->dateTime('submitted_at', 6)->nullable();
            $table->dateTime('completed_at', 6)->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->index(['subject_type', 'subject_id']);
            $table->index(['branch_id', 'status', 'current_stage', 'submitted_at'], 'approval_requests_queue_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_requests');
    }
};
