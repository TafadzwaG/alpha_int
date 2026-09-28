<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('setting_key', 120);
            $table->json('value_json');
            $table->string('data_type', 30)->default('json');
            $table->dateTime('effective_from', 6);
            $table->dateTime('effective_to', 6)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->unique(['organization_id', 'branch_id', 'setting_key', 'effective_from'], 'system_settings_scope_effective_unique');
            $table->index(['organization_id', 'setting_key', 'effective_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
