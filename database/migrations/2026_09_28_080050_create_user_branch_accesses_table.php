<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_branch_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('access_level', 30)->default('operational');
            $table->dateTime('valid_from', 6)->nullable();
            $table->dateTime('valid_to', 6)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps(6);
            $table->unique(['user_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_branch_access');
    }
};
