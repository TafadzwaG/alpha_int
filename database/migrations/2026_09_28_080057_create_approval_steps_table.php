<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence_no');
            $table->foreignId('required_role_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->decimal('threshold_min', 19, 4)->nullable();
            $table->char('threshold_currency', 3)->nullable();
            $table->string('status', 30)->default('pending');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('completed_at', 6)->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->unique(['approval_request_id', 'sequence_no']);
            $table->foreign('threshold_currency')->references('code')->on('currencies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_steps');
    }
};
