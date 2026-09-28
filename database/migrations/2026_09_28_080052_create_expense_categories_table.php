<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code', 40);
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('approval_threshold', 19, 4)->nullable();
            $table->char('policy_currency', 3)->nullable();
            $table->boolean('active')->default(true);
            $table->dateTime('effective_from', 6)->nullable();
            $table->dateTime('effective_to', 6)->nullable();
            $table->timestamps(6);
            $table->unique(['organization_id', 'code']);
            $table->foreign('policy_currency')->references('code')->on('currencies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};
