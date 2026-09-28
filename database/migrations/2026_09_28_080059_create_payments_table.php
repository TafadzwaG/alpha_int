<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('account_id')->constrained('client_accounts')->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('cash_session_id')->nullable()->constrained()->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->char('currency_code', 3);
            $table->foreignId('method_id')->constrained('payment_methods')->restrictOnDelete();
            $table->string('external_reference', 120)->nullable();
            $table->dateTime('received_at', 6);
            $table->string('status', 30)->default('draft');
            $table->foreignId('made_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approval_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at', 6)->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->unique(['branch_id', 'method_id', 'external_reference'], 'payments_reference_unique');
            $table->index(['account_id', 'status', 'received_at']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
