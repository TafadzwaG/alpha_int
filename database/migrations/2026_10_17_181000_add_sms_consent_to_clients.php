<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->boolean('sms_consent')->default(false)->after('phone_normalized')->index();
            $table->timestamp('sms_consent_at')->nullable()->after('sms_consent');
            $table->timestamp('sms_opted_out_at')->nullable()->after('sms_consent_at');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['sms_consent', 'sms_consent_at', 'sms_opted_out_at']);
        });
    }
};
