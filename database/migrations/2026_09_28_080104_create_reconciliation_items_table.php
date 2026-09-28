<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reconciliation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reconciliation_run_id')->constrained()->cascadeOnDelete();
            $table->string('item_type', 50);
            $table->string('source_type', 80)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->decimal('expected_amount', 19, 4)->default(0);
            $table->decimal('actual_amount', 19, 4)->default(0);
            $table->decimal('variance', 19, 4)->default(0);
            $table->text('note')->nullable();
            $table->timestamps(6);
            $table->index(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reconciliation_items');
    }
};
