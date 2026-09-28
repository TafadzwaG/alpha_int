<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reconciliation_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->date('business_date');
            $table->unsignedSmallInteger('run_no')->default(1);
            $table->decimal('expected_total', 19, 4)->default(0);
            $table->decimal('declared_total', 19, 4)->default(0);
            $table->decimal('deposited_total', 19, 4)->default(0);
            $table->decimal('variance', 19, 4)->default(0);
            $table->char('currency_code', 3);
            $table->string('status', 30)->default('draft');
            $table->foreignId('approval_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('prepared_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps(6);
            $table->unique(['branch_id', 'business_date', 'run_no', 'currency_code'], 'reconciliation_runs_scope_unique');
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reconciliation_runs');
    }
};
