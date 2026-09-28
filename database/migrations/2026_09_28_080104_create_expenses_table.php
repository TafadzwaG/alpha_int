<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('expense_no', 80);
            $table->string('payee');
            $table->char('currency_code', 3);
            $table->decimal('total_amount', 19, 4);
            $table->text('purpose');
            $table->dateTime('incurred_at', 6);
            $table->string('status', 30)->default('draft');
            $table->foreignId('made_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approval_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at', 6)->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->unique(['branch_id', 'expense_no']);
            $table->index(['branch_id', 'status', 'incurred_at']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
