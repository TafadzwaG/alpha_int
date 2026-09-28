<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('client_accounts')->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->date('posting_date');
            $table->unsignedSmallInteger('entry_sequence')->default(1);
            $table->string('entry_type', 40);
            $table->decimal('debit', 19, 4)->default(0);
            $table->decimal('credit', 19, 4)->default(0);
            $table->char('currency_code', 3);
            $table->string('source_type', 80);
            $table->unsignedBigInteger('source_id');
            $table->text('description')->nullable();
            $table->dateTime('posted_at', 6);
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at', 6)->useCurrent();
            $table->unique(['source_type', 'source_id', 'entry_sequence'], 'ledger_source_sequence_unique');
            $table->index(['account_id', 'posting_date', 'id']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_entries');
    }
};
