<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->constrained('stand_allocations')->cascadeOnDelete();
            $table->unsignedInteger('sequence_no');
            $table->date('due_date');
            $table->decimal('amount_due', 19, 4);
            $table->decimal('amount_paid', 19, 4)->default(0);
            $table->char('currency_code', 3);
            $table->string('status', 30)->default('scheduled');
            $table->dateTime('paid_at', 6)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps(6);
            $table->unique(['allocation_id', 'sequence_no']);
            $table->index(['allocation_id', 'status', 'due_date']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });

        Schema::table('payment_allocations', function (Blueprint $table) {
            $table->foreignId('installment_id')
                ->nullable()
                ->after('charge_id')
                ->constrained('installments')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_allocations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('installment_id');
        });
        Schema::dropIfExists('installments');
    }
};
