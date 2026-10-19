<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->string('statement_no', 80);
            $table->date('statement_date');
            $table->date('from_date');
            $table->date('to_date');
            $table->char('currency_code', 3);
            $table->decimal('opening_balance', 19, 4)->default(0);
            $table->decimal('statement_balance', 19, 4);
            $table->decimal('ledger_balance', 19, 4)->default(0);
            $table->decimal('variance', 19, 4)->default(0);
            $table->string('status', 25)->default('in_review');
            $table->string('original_filename')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'supplier_id', 'statement_no'], 'supplier_recon_statement_unique');
            $table->index(['organization_id', 'status', 'statement_date'], 'supplier_recon_status_date_idx');
        });

        Schema::create('supplier_reconciliation_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_reconciliation_id')->constrained()->cascadeOnDelete();
            $table->date('transaction_date');
            $table->string('transaction_type', 30);
            $table->string('reference', 120)->nullable();
            $table->string('description', 500);
            $table->decimal('amount', 19, 4);
            $table->string('line_hash', 64);
            $table->string('match_status', 20)->default('unmatched');
            $table->string('match_type', 100)->nullable();
            $table->unsignedBigInteger('match_id')->nullable();
            $table->text('resolution_note')->nullable();
            $table->foreignId('matched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('matched_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['supplier_reconciliation_id', 'line_hash'], 'supplier_recon_line_hash_unique');
            $table->index(['match_type', 'match_id'], 'supplier_recon_line_match_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_reconciliation_lines');
        Schema::dropIfExists('supplier_reconciliations');
    }
};
