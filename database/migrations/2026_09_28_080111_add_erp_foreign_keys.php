<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('organization_id')->references('id')->on('organizations')->nullOnDelete();
            $table->foreign('home_branch_id')->references('id')->on('branches')->nullOnDelete();
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::table('model_has_roles', function (Blueprint $table) {
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::table('model_has_permissions', function (Blueprint $table) {
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('model_has_permissions', fn (Blueprint $table) => $table->dropForeign(['organization_id']));
        Schema::table('model_has_roles', fn (Blueprint $table) => $table->dropForeign(['organization_id']));
        Schema::table('roles', fn (Blueprint $table) => $table->dropForeign(['organization_id']));
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropForeign(['home_branch_id']);
        });
    }
};
