<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_dimensions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 30);
            $table->string('code', 40);
            $table->string('name', 120);
            $table->boolean('active')->default(true);
            $table->timestamps(6);
            $table->unique(['organization_id', 'kind', 'code'], 'accounting_dimensions_scope_unique');
        });

        Schema::create('accounting_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained()->cascadeOnDelete();
            $table->foreignId('accounting_dimension_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('gl_account_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('period_number');
            $table->decimal('amount', 19, 4);
            $table->decimal('warning_threshold', 7, 2)->default(100);
            $table->boolean('require_approval')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->index(['organization_id', 'fiscal_year_id', 'period_number'], 'accounting_budgets_period_idx');
        });

        Schema::create('sales_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('client_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('sales_documents')->nullOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('account_charge_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('accounting_dimension_id')->nullable()->constrained()->nullOnDelete();
            $table->string('document_type', 30);
            $table->string('document_no', 60);
            $table->date('document_date');
            $table->date('due_date')->nullable();
            $table->char('currency_code', 3);
            $table->decimal('exchange_rate', 18, 8)->default(1);
            $table->decimal('subtotal', 19, 4);
            $table->decimal('line_discount_total', 19, 4)->default(0);
            $table->decimal('document_discount_rate', 7, 4)->default(0);
            $table->decimal('document_discount_amount', 19, 4)->default(0);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->decimal('total_amount', 19, 4);
            $table->string('status', 20)->default('draft');
            $table->text('description')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_pattern', 20)->nullable();
            $table->date('next_run_on')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at', 6)->nullable();
            $table->timestamp('approved_at', 6)->nullable();
            $table->timestamp('posted_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'document_no']);
            $table->index(['organization_id', 'document_type', 'status'], 'sales_documents_register_idx');
        });

        Schema::create('sales_document_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_item_id')->nullable()->constrained('catalog_items')->nullOnDelete();
            $table->foreignId('revenue_account_id')->constrained('gl_accounts')->restrictOnDelete();
            $table->string('description', 255);
            $table->decimal('quantity', 15, 4)->default(1);
            $table->decimal('unit_price', 19, 4);
            $table->decimal('unit_cost', 19, 4)->default(0);
            $table->decimal('discount_rate', 7, 4)->default(0);
            $table->decimal('discount_amount', 19, 4)->default(0);
            $table->string('tax_code', 20)->nullable();
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('line_subtotal', 19, 4);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->decimal('line_total', 19, 4);
            $table->timestamps(6);
        });

        Schema::create('bank_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('match_operator', 20)->default('contains');
            $table->string('pattern', 180);
            $table->foreignId('counter_account_id')->constrained('gl_accounts')->restrictOnDelete();
            $table->foreignId('accounting_dimension_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('priority')->default(100);
            $table->boolean('active')->default(true);
            $table->timestamps(6);
            $table->index(['organization_id', 'active', 'priority']);
        });

        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('bank_statement_import_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference', 80);
            $table->date('from_date');
            $table->date('to_date');
            $table->decimal('opening_statement_balance', 19, 4);
            $table->decimal('closing_statement_balance', 19, 4);
            $table->decimal('ledger_closing_balance', 19, 4)->default(0);
            $table->decimal('difference', 19, 4)->default(0);
            $table->string('status', 20)->default('draft');
            $table->text('review_note')->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at', 6)->nullable();
            $table->timestamp('approved_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'reference']);
        });

        Schema::create('bank_reconciliation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_reconciliation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_statement_line_id')->constrained()->cascadeOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('unmatched');
            $table->text('resolution_note')->nullable();
            $table->foreignId('matched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('matched_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['bank_reconciliation_id', 'bank_statement_line_id'], 'bank_reconciliation_line_unique');
        });

        Schema::create('inventory_controls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->string('control_no', 60);
            $table->string('control_type', 30);
            $table->date('control_date');
            $table->string('status', 20)->default('draft');
            $table->text('reason');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at', 6)->nullable();
            $table->timestamp('posted_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'control_no']);
        });

        Schema::create('inventory_control_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_control_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_item_id')->constrained()->restrictOnDelete();
            $table->decimal('system_quantity', 15, 4)->default(0);
            $table->decimal('counted_quantity', 15, 4)->default(0);
            $table->decimal('quantity_delta', 15, 4);
            $table->decimal('unit_cost', 19, 4);
            $table->decimal('value_delta', 19, 4);
            $table->foreignId('counter_account_id')->constrained('gl_accounts')->restrictOnDelete();
            $table->text('note')->nullable();
            $table->timestamps(6);
            $table->unique(['inventory_control_id', 'catalog_item_id'], 'inventory_control_item_unique');
        });

        Schema::create('vat_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('previous_return_id')->nullable()->constrained('vat_returns')->nullOnDelete();
            $table->date('from_date');
            $table->date('to_date');
            $table->char('currency_code', 3);
            $table->unsignedSmallInteger('version')->default(1);
            $table->decimal('output_tax', 19, 4)->default(0);
            $table->decimal('input_tax', 19, 4)->default(0);
            $table->decimal('net_tax', 19, 4)->default(0);
            $table->decimal('control_balance', 19, 4)->default(0);
            $table->decimal('variance', 19, 4)->default(0);
            $table->string('status', 20)->default('draft');
            $table->text('amendment_reason')->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at', 6)->nullable();
            $table->timestamp('approved_at', 6)->nullable();
            $table->timestamp('submitted_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'from_date', 'to_date', 'version'], 'vat_return_period_version_unique');
        });

        Schema::create('accounting_closes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('accounting_period_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('retained_earnings_journal_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('opening_balance_journal_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->string('close_type', 20);
            $table->string('reference', 80);
            $table->string('status', 20)->default('draft');
            $table->text('reopen_reason')->nullable();
            $table->json('opening_balances_json')->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reopen_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at', 6)->nullable();
            $table->timestamp('approved_at', 6)->nullable();
            $table->timestamp('reopened_at', 6)->nullable();
            $table->timestamp('reopen_approved_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'reference']);
        });

        Schema::create('accounting_close_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('accounting_close_id')->constrained()->cascadeOnDelete();
            $table->string('task_key', 50);
            $table->string('label', 160);
            $table->string('status', 20)->default('pending');
            $table->text('evidence')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['accounting_close_id', 'task_key']);
        });

        Schema::create('accounting_approval_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('role_name', 80)->nullable();
            $table->string('transaction_type', 40);
            $table->decimal('minimum_amount', 19, 4)->default(0);
            $table->decimal('maximum_amount', 19, 4)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps(6);
            $table->index(['organization_id', 'transaction_type', 'active'], 'accounting_approval_limit_idx');
        });

        Schema::create('accounting_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('subject_type', 100);
            $table->unsignedBigInteger('subject_id');
            $table->string('original_name');
            $table->string('disk', 30)->default('local');
            $table->string('path');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->index(['subject_type', 'subject_id']);
        });

        Schema::table('catalog_items', function (Blueprint $table) {
            $table->decimal('average_cost', 19, 4)->default(0)->after('default_cost');
        });
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->foreignId('gl_account_id')->nullable()->after('branch_id')->constrained()->nullOnDelete();
        });
        Schema::table('journal_lines', function (Blueprint $table) {
            $table->foreignId('accounting_dimension_id')->nullable()->after('client_account_id')->constrained()->nullOnDelete();
        });
        Schema::table('customer_invoices', function (Blueprint $table) {
            $table->foreignId('accounting_dimension_id')->nullable()->after('client_account_id')->constrained()->nullOnDelete();
            $table->decimal('discount_amount', 19, 4)->default(0)->after('subtotal');
            $table->timestamp('locked_at', 6)->nullable()->after('posted_at');
        });
        Schema::table('supplier_bills', function (Blueprint $table) {
            $table->foreignId('accounting_dimension_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
            $table->timestamp('locked_at', 6)->nullable()->after('posted_at');
        });
        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignId('accounting_dimension_id')->nullable()->after('branch_id')->constrained()->nullOnDelete();
        });
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreignId('submitted_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->after('submitted_by')->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at', 6)->nullable()->after('posted_at');
            $table->timestamp('approved_at', 6)->nullable()->after('submitted_at');
            $table->timestamp('locked_at', 6)->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by');
            $table->dropConstrainedForeignId('submitted_by');
            $table->dropColumn(['submitted_at', 'approved_at', 'locked_at']);
        });
        Schema::table('expenses', fn (Blueprint $table) => $table->dropConstrainedForeignId('accounting_dimension_id'));
        Schema::table('supplier_bills', function (Blueprint $table) {
            $table->dropConstrainedForeignId('accounting_dimension_id');
            $table->dropColumn('locked_at');
        });
        Schema::table('customer_invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('accounting_dimension_id');
            $table->dropColumn(['discount_amount', 'locked_at']);
        });
        Schema::table('journal_lines', fn (Blueprint $table) => $table->dropConstrainedForeignId('accounting_dimension_id'));
        Schema::table('bank_accounts', fn (Blueprint $table) => $table->dropConstrainedForeignId('gl_account_id'));
        Schema::table('catalog_items', fn (Blueprint $table) => $table->dropColumn('average_cost'));

        Schema::dropIfExists('accounting_attachments');
        Schema::dropIfExists('accounting_approval_limits');
        Schema::dropIfExists('accounting_close_tasks');
        Schema::dropIfExists('accounting_closes');
        Schema::dropIfExists('vat_returns');
        Schema::dropIfExists('inventory_control_lines');
        Schema::dropIfExists('inventory_controls');
        Schema::dropIfExists('bank_reconciliation_items');
        Schema::dropIfExists('bank_reconciliations');
        Schema::dropIfExists('bank_rules');
        Schema::dropIfExists('sales_document_lines');
        Schema::dropIfExists('sales_documents');
        Schema::dropIfExists('accounting_budgets');
        Schema::dropIfExists('accounting_dimensions');
    }
};
