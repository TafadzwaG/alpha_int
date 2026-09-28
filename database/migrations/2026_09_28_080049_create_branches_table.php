<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->string('timezone', 64)->default('Africa/Harare');
            $table->text('address')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps(6);
            $table->unique(['organization_id', 'code']);
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
