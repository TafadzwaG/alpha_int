<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('document_type', 40);
            $table->string('period_key', 20);
            $table->string('prefix', 30)->nullable();
            $table->unsignedBigInteger('next_value')->default(1);
            $table->unsignedTinyInteger('padding')->default(6);
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->unique(['organization_id', 'branch_id', 'document_type', 'period_key'], 'document_sequences_scope_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_sequences');
    }
};
