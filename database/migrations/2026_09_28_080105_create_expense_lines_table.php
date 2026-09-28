<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->text('description');
            $table->decimal('amount', 19, 4);
            $table->decimal('tax_amount', 19, 4)->default(0);
            $table->timestamps(6);
            $table->index(['expense_id', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_lines');
    }
};
