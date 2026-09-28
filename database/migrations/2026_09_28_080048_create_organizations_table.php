<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('legal_name');
            $table->string('trading_name')->nullable();
            $table->string('registration_no', 80)->nullable();
            $table->char('base_currency_code', 3)->default('USD');
            $table->string('timezone', 64)->default('Africa/Harare');
            $table->string('status', 20)->default('active')->index();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
