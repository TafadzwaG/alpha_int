<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gl_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('gl_accounts')->nullOnDelete();
            $table->string('code', 30);
            $table->string('name', 120);
            $table->string('type', 20);
            $table->string('subtype', 40)->nullable();
            $table->string('normal_balance', 6);
            $table->string('system_key', 50)->nullable();
            $table->boolean('control_account')->default(false);
            $table->boolean('allow_manual_posting')->default(true);
            $table->boolean('active')->default(true);
            $table->timestamps(6);
            $table->unique(['organization_id', 'code']);
            $table->unique(['organization_id', 'system_key']);
            $table->index(['organization_id', 'type', 'active']);
        });

        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name', 40);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('status', 20)->default('open');
            $table->timestamps(6);
            $table->unique(['organization_id', 'starts_on']);
        });

        Schema::create('accounting_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiscal_year_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('period_number');
            $table->string('name', 40);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('status', 20)->default('open');
            $table->timestamp('closed_at', 6)->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['fiscal_year_id', 'period_number']);
            $table->index(['starts_on', 'ends_on', 'status']);
        });

        Schema::create('tax_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code', 20);
            $table->string('name', 80);
            $table->decimal('rate', 7, 4)->default(0);
            $table->string('type', 20)->default('vat');
            $table->foreignId('input_account_id')->nullable()->constrained('gl_accounts')->nullOnDelete();
            $table->foreignId('output_account_id')->nullable()->constrained('gl_accounts')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->timestamps(6);
            $table->unique(['organization_id', 'code']);
        });

        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('accounting_period_id')->nullable()->constrained()->nullOnDelete();
            $table->string('journal_no', 50);
            $table->string('journal_type', 30)->default('general');
            $table->date('entry_date');
            $table->string('reference', 120)->nullable();
            $table->text('description');
            $table->char('currency_code', 3);
            $table->decimal('exchange_rate', 18, 8)->default(1);
            $table->string('status', 20)->default('draft');
            $table->string('source_type', 100)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('reversal_of_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reversed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at', 6)->nullable();
            $table->timestamp('reversed_at', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'journal_no']);
            $table->unique(['organization_id', 'source_type', 'source_id'], 'journal_source_unique');
            $table->index(['organization_id', 'entry_date', 'status']);
        });

        Schema::create('journal_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gl_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('client_account_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('line_number');
            $table->string('description', 255)->nullable();
            $table->decimal('debit', 19, 4)->default(0);
            $table->decimal('credit', 19, 4)->default(0);
            $table->decimal('base_debit', 19, 4)->default(0);
            $table->decimal('base_credit', 19, 4)->default(0);
            $table->string('tax_code', 20)->nullable();
            $table->timestamps(6);
            $table->unique(['journal_entry_id', 'line_number']);
            $table->index(['gl_account_id', 'journal_entry_id']);
        });

        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('supplier_no', 40);
            $table->string('name', 150);
            $table->string('tax_number', 60)->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->text('address')->nullable();
            $table->string('currency_code', 3)->default('USD');
            $table->unsignedSmallInteger('payment_terms_days')->default(30);
            $table->string('status', 20)->default('active');
            $table->timestamps(6);
            $table->unique(['organization_id', 'supplier_no']);
            $table->index(['organization_id', 'name']);
        });

        Schema::create('supplier_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->string('bill_no', 50);
            $table->string('supplier_reference', 100)->nullable();
            $table->date('bill_date');
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
            $table->unique(['organization_id', 'bill_no']);
            $table->index(['organization_id', 'status', 'due_date']);
        });

        Schema::create('supplier_bill_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_bill_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gl_account_id')->constrained()->restrictOnDelete();
            $table->string('description', 255);
            $table->decimal('quantity', 15, 4)->default(1);
            $table->decimal('unit_price', 19, 4);
            $table->string('tax_code', 20)->nullable();
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('line_subtotal', 19, 4);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->decimal('line_total', 19, 4);
            $table->timestamps(6);
        });

        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_bill_id')->constrained()->restrictOnDelete();
            $table->foreignId('bank_account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 19, 4);
            $table->char('currency_code', 3);
            $table->string('reference', 120);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['supplier_bill_id', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('supplier_bill_lines');
        Schema::dropIfExists('supplier_bills');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('tax_codes');
        Schema::dropIfExists('accounting_periods');
        Schema::dropIfExists('fiscal_years');
        Schema::dropIfExists('gl_accounts');
    }
};
