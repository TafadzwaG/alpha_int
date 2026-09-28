<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('owning_branch_id')->constrained('branches')->restrictOnDelete();
            $table->string('client_no', 50);
            $table->string('first_name');
            $table->string('middle_names')->nullable();
            $table->string('last_name');
            $table->string('search_name')->index();
            $table->string('national_id_hash', 64)->nullable()->index();
            $table->text('national_id_encrypted')->nullable();
            $table->string('phone_normalized', 30)->nullable()->index();
            $table->string('status', 30)->default('active');
            $table->timestamps(6);
            $table->softDeletes(precision: 6);
            $table->unique(['organization_id', 'client_no']);
            $table->index(['organization_id', 'owning_branch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
