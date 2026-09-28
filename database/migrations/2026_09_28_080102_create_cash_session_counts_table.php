<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_session_counts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained()->cascadeOnDelete();
            $table->char('currency_code', 3);
            $table->decimal('denomination', 19, 4);
            $table->unsignedInteger('quantity');
            $table->decimal('amount', 19, 4);
            $table->timestamps(6);
            $table->unique(['cash_session_id', 'currency_code', 'denomination'], 'cash_session_counts_denomination_unique');
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_session_counts');
    }
};
