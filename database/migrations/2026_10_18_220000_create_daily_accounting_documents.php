<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->boolean('track_inventory')->default(false)->after('type');
            $table->decimal('default_cost', 19, 4)->default(0)->after('default_unit_price');
            $table->decimal('reorder_level', 15, 4)->default(0)->after('default_cost');
            $table->foreignId('revenue_account_id')->nullable()->after('expense_account_id')->constrained('gl_accounts')->nullOnDelete();
            $table->foreignId('inventory_account_id')->nullable()->after('revenue_account_id')->constrained('gl_accounts')->nullOnDelete();
            $table->foreignId('cogs_account_id')->nullable()->after('inventory_account_id')->constrained('gl_accounts')->nullOnDelete();
        });

        Schema::create('customer_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('client_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('account_charge_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_no', 50);
            $table->date('invoice_date');
            $table->date('due_date');
            $table->char('currency_code', 3);
            $table->decimal('subtotal', 19, 4);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->decimal('total_amount', 19, 4);
            $table->decimal('paid_amount', 19, 4)->default(0);
            $table->string('status', 20)->default('draft');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'invoice_no']);
            $table->index(['organization_id', 'status', 'due_date']);
        });

        Schema::create('customer_invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_item_id')->nullable()->constrained('catalog_items')->nullOnDelete();
            $table->foreignId('revenue_account_id')->constrained('gl_accounts')->restrictOnDelete();
            $table->string('description', 255);
            $table->decimal('quantity', 15, 4)->default(1);
            $table->decimal('unit_price', 19, 4);
            $table->decimal('unit_cost', 19, 4)->default(0);
            $table->string('tax_code', 20)->nullable();
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('line_subtotal', 19, 4);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->decimal('line_total', 19, 4);
            $table->timestamps(6);
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->string('po_no', 50);
            $table->date('order_date');
            $table->date('expected_date')->nullable();
            $table->char('currency_code', 3);
            $table->decimal('subtotal', 19, 4);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->decimal('total_amount', 19, 4);
            $table->string('status', 20)->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'po_no']);
            $table->index(['organization_id', 'status', 'order_date']);
        });

        Schema::create('purchase_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_item_id')->nullable()->constrained('catalog_items')->nullOnDelete();
            $table->foreignId('gl_account_id')->constrained()->restrictOnDelete();
            $table->string('description', 255);
            $table->decimal('ordered_quantity', 15, 4);
            $table->decimal('received_quantity', 15, 4)->default(0);
            $table->decimal('unit_price', 19, 4);
            $table->string('tax_code', 20)->nullable();
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('line_subtotal', 19, 4);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->decimal('line_total', 19, 4);
            $table->timestamps(6);
        });

        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('purchase_order_id')->constrained()->restrictOnDelete();
            $table->string('receipt_no', 50);
            $table->date('received_date');
            $table->string('supplier_reference', 100)->nullable();
            $table->string('status', 20)->default('posted');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['organization_id', 'receipt_no']);
        });

        Schema::create('goods_receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_order_line_id')->constrained()->restrictOnDelete();
            $table->foreignId('catalog_item_id')->nullable()->constrained('catalog_items')->nullOnDelete();
            $table->decimal('quantity', 15, 4);
            $table->decimal('unit_cost', 19, 4);
            $table->timestamps(6);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('catalog_item_id')->constrained()->restrictOnDelete();
            $table->string('movement_type', 20);
            $table->decimal('quantity', 15, 4);
            $table->decimal('unit_cost', 19, 4)->default(0);
            $table->string('source_type', 100);
            $table->unsignedBigInteger('source_id');
            $table->string('reference', 100)->nullable();
            $table->timestamp('occurred_at', 6);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->index(['organization_id', 'catalog_item_id', 'branch_id'], 'inventory_org_item_branch_idx');
            $table->unique(['source_type', 'source_id', 'catalog_item_id', 'movement_type'], 'inventory_source_unique');
        });

        Schema::create('bank_statement_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained()->restrictOnDelete();
            $table->string('statement_no', 60);
            $table->date('from_date');
            $table->date('to_date');
            $table->char('currency_code', 3);
            $table->string('original_filename');
            $table->string('status', 20)->default('imported');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['organization_id', 'bank_account_id', 'statement_no'], 'bank_statement_org_account_no_unique');
        });

        Schema::create('bank_statement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_statement_import_id')->constrained()->cascadeOnDelete();
            $table->date('transaction_date');
            $table->string('reference', 120)->nullable();
            $table->string('description', 500);
            $table->decimal('amount', 19, 4);
            $table->decimal('balance', 19, 4)->nullable();
            $table->string('line_hash', 64);
            $table->string('match_type', 100)->nullable();
            $table->unsignedBigInteger('match_id')->nullable();
            $table->timestamp('matched_at', 6)->nullable();
            $table->foreignId('matched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['bank_statement_import_id', 'line_hash'], 'bank_statement_line_hash_unique');
            $table->index(['match_type', 'match_id']);
        });

        Schema::table('account_charges', function (Blueprint $table) {
            $table->string('source_type', 100)->nullable()->after('description');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->index(['source_type', 'source_id']);
        });

        Schema::table('supplier_bills', function (Blueprint $table) {
            $table->foreignId('purchase_order_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
            $table->foreignId('goods_receipt_id')->nullable()->after('purchase_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('bank_deposits', function (Blueprint $table) {
            $table->foreignId('journal_entry_id')->nullable()->after('bank_account_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bank_deposits', fn (Blueprint $table) => $table->dropConstrainedForeignId('journal_entry_id'));
        Schema::table('supplier_bills', function (Blueprint $table) {
            $table->dropConstrainedForeignId('goods_receipt_id');
            $table->dropConstrainedForeignId('purchase_order_id');
        });
        Schema::table('account_charges', function (Blueprint $table) {
            $table->dropIndex(['source_type', 'source_id']);
            $table->dropColumn(['source_type', 'source_id']);
        });
        Schema::dropIfExists('bank_statement_lines');
        Schema::dropIfExists('bank_statement_imports');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('goods_receipt_lines');
        Schema::dropIfExists('goods_receipts');
        Schema::dropIfExists('purchase_order_lines');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('customer_invoice_lines');
        Schema::dropIfExists('customer_invoices');
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cogs_account_id');
            $table->dropConstrainedForeignId('inventory_account_id');
            $table->dropConstrainedForeignId('revenue_account_id');
            $table->dropColumn(['track_inventory', 'default_cost', 'reorder_level']);
        });
    }
};
