<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_campaigns', function (Blueprint $table) {
            $table->uuid('idempotency_key')->nullable()->after('created_by');
            $table->unique(['organization_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::table('sms_campaigns', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'idempotency_key']);
            $table->dropColumn('idempotency_key');
        });
    }
};
