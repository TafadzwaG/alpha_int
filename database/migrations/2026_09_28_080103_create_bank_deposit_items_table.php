<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_deposit_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_deposit_id')->constrained()->cascadeOnDelete();
            $table->string('source_type', 80);
            $table->unsignedBigInteger('source_id');
            $table->decimal('amount', 19, 4);
            $table->timestamps(6);
            $table->unique(['bank_deposit_id', 'source_type', 'source_id'], 'bank_deposit_items_source_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_deposit_items');
    }
};
