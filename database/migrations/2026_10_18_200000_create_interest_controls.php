<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interest_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete()->unique();
            $table->string('name', 100)->default('Standard overdue interest');
            $table->decimal('base_annual_rate', 7, 4)->default(12);
            $table->unsignedSmallInteger('grace_days')->default(30);
            $table->unsignedSmallInteger('merit_window_months')->default(6);
            $table->decimal('merit_exemption_threshold', 5, 2)->default(90);
            $table->decimal('merit_discount_threshold', 5, 2)->default(75);
            $table->decimal('discounted_annual_rate', 7, 4)->default(6);
            $table->decimal('minimum_overdue_balance', 19, 4)->default(0);
            $table->boolean('active')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
        });

        Schema::create('interest_exemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_account_id')->constrained()->cascadeOnDelete();
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->decimal('rate_override', 7, 4)->default(0);
            $table->text('reason');
            $table->string('status', 20)->default('active');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);
            $table->index(['client_account_id', 'status', 'starts_on', 'ends_on'], 'interest_exemption_active_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interest_exemptions');
        Schema::dropIfExists('interest_policies');
    }
};
