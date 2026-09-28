<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('clients', '6') && ! Schema::hasColumn('clients', 'deleted_at')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->renameColumn('6', 'deleted_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('clients', 'deleted_at') && ! Schema::hasColumn('clients', '6')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->renameColumn('deleted_at', '6');
            });
        }
    }
};
