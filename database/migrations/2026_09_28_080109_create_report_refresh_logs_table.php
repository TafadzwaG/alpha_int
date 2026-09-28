<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_refresh_log', function (Blueprint $table) {
            $table->id();
            $table->string('dataset_name', 120);
            $table->dateTime('started_at', 6);
            $table->dateTime('completed_at', 6)->nullable();
            $table->dateTime('watermark_from', 6)->nullable();
            $table->dateTime('watermark_to', 6)->nullable();
            $table->unsignedBigInteger('row_count')->default(0);
            $table->string('status', 30)->default('running');
            $table->text('error_message')->nullable();
            $table->timestamps(6);
            $table->index(['dataset_name', 'status', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_refresh_log');
    }
};
