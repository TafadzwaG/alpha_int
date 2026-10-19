<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_recipients', function (Blueprint $table) {
            $table->string('provider_status', 40)->nullable()->after('provider_message_id');
            $table->timestamp('delivered_at')->nullable()->after('sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('sms_recipients', function (Blueprint $table) {
            $table->dropColumn(['provider_status', 'delivered_at']);
        });
    }
};
