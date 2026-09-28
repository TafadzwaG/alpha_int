<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->date('rate_date');
            $table->char('base_currency', 3);
            $table->char('quote_currency', 3);
            $table->decimal('rate', 19, 8);
            $table->string('source', 120);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['rate_date', 'base_currency', 'quote_currency']);
            $table->foreign('base_currency')->references('code')->on('currencies')->restrictOnDelete();
            $table->foreign('quote_currency')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};
