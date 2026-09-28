<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('development_phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('development_id')->constrained()->cascadeOnDelete();
            $table->string('code', 40);
            $table->string('name');
            $table->string('survey_status', 30)->default('pending');
            $table->date('planned_completion_date')->nullable();
            $table->timestamps(6);
            $table->unique(['development_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('development_phases');
    }
};
