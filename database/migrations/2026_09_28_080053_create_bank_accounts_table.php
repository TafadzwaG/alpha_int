<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('bank_name');
            $table->string('account_name');
            $table->string('account_mask', 80);
            $table->text('account_reference_encrypted')->nullable();
            $table->char('currency_code', 3);
            $table->boolean('active')->default(true);
            $table->timestamps(6);
            $table->unique(['organization_id', 'account_mask']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
