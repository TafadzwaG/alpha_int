<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name', 100);
            $table->boolean('requires_reference')->default(false);
            $table->boolean('cash_equivalent')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
