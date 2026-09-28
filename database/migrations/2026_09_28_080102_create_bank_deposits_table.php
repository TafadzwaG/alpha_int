<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_deposits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('bank_account_id')->constrained()->restrictOnDelete();
            $table->date('deposit_date');
            $table->decimal('amount', 19, 4);
            $table->char('currency_code', 3);
            $table->foreignId('slip_document_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->string('reference', 120);
            $table->string('status', 30)->default('draft');
            $table->foreignId('deposited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('cleared_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['bank_account_id', 'reference']);
            $table->index(['branch_id', 'deposit_date', 'status']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_deposits');
    }
};
