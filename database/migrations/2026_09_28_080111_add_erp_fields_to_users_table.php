<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->after('id')->index();
            $table->unsignedBigInteger('home_branch_id')->nullable()->after('organization_id')->index();
            $table->string('mfa_state', 30)->default('disabled')->after('password');
            $table->string('status', 30)->default('active')->after('mfa_state')->index();
            $table->dateTime('last_login_at', 6)->nullable()->after('status');
            $table->unsignedInteger('lock_version')->default(0)->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'organization_id',
                'home_branch_id',
                'mfa_state',
                'status',
                'last_login_at',
                'lock_version',
            ]);
        });
    }
};
