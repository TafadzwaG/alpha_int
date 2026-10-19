<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('default_supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('expense_account_id')->nullable()->constrained('gl_accounts')->nullOnDelete();
            $table->foreignId('tax_code_id')->nullable()->constrained('tax_codes')->nullOnDelete();
            $table->string('code', 40);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('type', 20);
            $table->string('unit_of_measure', 30)->default('each');
            $table->decimal('default_unit_price', 19, 4)->default(0);
            $table->char('currency_code', 3)->default('USD');
            $table->string('status', 20)->default('active');
            $table->timestamps(6);

            $table->unique(['organization_id', 'code']);
            $table->index(['organization_id', 'type', 'status']);
            $table->index(['organization_id', 'name']);
        });

        Schema::table('supplier_bill_lines', function (Blueprint $table) {
            $table->foreignId('catalog_item_id')->nullable()->after('supplier_bill_id')->constrained('catalog_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('supplier_bill_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('catalog_item_id');
        });

        Schema::dropIfExists('catalog_items');
    }
};
