<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('phase_id')->constrained('development_phases')->cascadeOnDelete();
            $table->foreignId('stand_type_id')->constrained()->restrictOnDelete();
            $table->string('stand_no', 60);
            $table->decimal('area_sqm', 12, 2)->nullable();
            $table->decimal('list_price', 19, 4);
            $table->char('currency_code', 3);
            $table->string('physical_status', 30)->default('planned');
            $table->string('survey_reference')->nullable();
            $table->json('geo_json')->nullable();
            $table->timestamps(6);
            $table->unique(['phase_id', 'stand_no']);
            $table->index(['stand_type_id', 'physical_status']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stands');
    }
};
