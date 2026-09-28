<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->text('value_encrypted');
            $table->string('value_hash', 64)->nullable()->index();
            $table->string('normalized_value')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->dateTime('verified_at', 6)->nullable();
            $table->timestamps(6);
            $table->index(['client_id', 'type', 'is_primary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_contacts');
    }
};
