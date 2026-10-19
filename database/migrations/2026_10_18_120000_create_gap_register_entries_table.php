<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gap_register_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('stand_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('stand_allocation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('register_type', 40);
            $table->string('stand_no_snapshot', 80)->nullable();
            $table->string('first_name_snapshot')->nullable();
            $table->string('surname_snapshot')->nullable();
            $table->string('cooperative')->nullable();
            $table->string('contacts', 80)->nullable();
            $table->decimal('stand_size', 19, 4)->nullable();
            $table->decimal('stand_price', 19, 4)->nullable();
            $table->decimal('interest_amount', 19, 4)->nullable();
            $table->decimal('amount_paid', 19, 4)->nullable();
            $table->decimal('balance', 19, 4)->nullable();
            $table->date('last_payment_date')->nullable();
            $table->text('register_comment')->nullable();
            $table->string('captured_by')->nullable();
            $table->char('currency_code', 3)->nullable();
            $table->string('source_sheet')->nullable();
            $table->unsignedInteger('source_row')->nullable();
            $table->timestamps(6);

            $table->index(['organization_id', 'register_type']);
            $table->index(['branch_id', 'register_type']);
            $table->unique(
                ['organization_id', 'branch_id', 'register_type', 'source_sheet', 'source_row'],
                'gap_register_source_unique',
            );
            $table->foreign('currency_code')->references('code')->on('currencies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gap_register_entries');
    }
};
