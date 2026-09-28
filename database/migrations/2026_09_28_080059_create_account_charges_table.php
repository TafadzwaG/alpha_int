<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('client_accounts')->restrictOnDelete();
            $table->string('charge_type', 50);
            $table->text('description')->nullable();
            $table->decimal('amount', 19, 4);
            $table->char('currency_code', 3);
            $table->date('due_date')->nullable();
            $table->foreignId('approval_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('draft');
            $table->dateTime('posted_at', 6)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->index(['account_id', 'status', 'due_date']);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_charges');
    }
};
