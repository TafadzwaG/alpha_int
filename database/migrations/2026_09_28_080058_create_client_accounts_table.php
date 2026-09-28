<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_file_id')->constrained()->restrictOnDelete();
            $table->foreignId('allocation_id')->nullable()->constrained('stand_allocations')->restrictOnDelete();
            $table->string('account_no', 60)->unique();
            $table->char('currency_code', 3);
            $table->dateTime('opened_at', 6);
            $table->dateTime('closed_at', 6)->nullable();
            $table->string('status', 30)->default('open');
            $table->timestamps(6);
            $table->index(['client_file_id', 'status']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_accounts');
    }
};
