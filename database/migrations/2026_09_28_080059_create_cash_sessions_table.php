<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('cashier_id')->constrained('users')->restrictOnDelete();
            $table->dateTime('opened_at', 6);
            $table->dateTime('closed_at', 6)->nullable();
            $table->decimal('opening_float', 19, 4)->default(0);
            $table->decimal('expected_cash', 19, 4)->default(0);
            $table->decimal('declared_cash', 19, 4)->nullable();
            $table->char('currency_code', 3);
            $table->string('status', 30)->default('open');
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->index(['branch_id', 'cashier_id', 'status']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_sessions');
    }
};
