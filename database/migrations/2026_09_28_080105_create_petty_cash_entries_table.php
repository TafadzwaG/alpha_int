<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('petty_cash_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('cash_session_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('expense_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('entry_type', 30);
            $table->decimal('amount', 19, 4);
            $table->char('currency_code', 3);
            $table->dateTime('posted_at', 6);
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at', 6)->useCurrent();
            $table->index(['branch_id', 'posted_at']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('petty_cash_entries');
    }
};
