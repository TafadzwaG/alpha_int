<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('file_no', 60);
            $table->dateTime('opened_at', 6);
            $table->dateTime('closed_at', 6)->nullable();
            $table->string('lifecycle_status', 30)->default('open');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['branch_id', 'file_no']);
            $table->index(['client_id', 'lifecycle_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_files');
    }
};
