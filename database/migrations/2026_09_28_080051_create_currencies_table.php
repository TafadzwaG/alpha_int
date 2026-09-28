<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->char('code', 3)->primary();
            $table->string('name', 80);
            $table->string('symbol', 10)->nullable();
            $table->unsignedTinyInteger('decimal_places')->default(2);
            $table->boolean('active')->default(true);
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('currencies');
    }
};
