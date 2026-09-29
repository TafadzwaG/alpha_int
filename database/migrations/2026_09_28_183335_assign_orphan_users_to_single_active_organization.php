<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $organizationId = DB::table('organizations')
            ->where('code', 'ALPHA')
            ->where('status', 'active')
            ->value('id');

        if (! $organizationId) {
            $organizations = DB::table('organizations')
                ->where('status', 'active')
                ->orderBy('id')
                ->limit(2)
                ->get(['id']);

            if ($organizations->count() !== 1) {
                return;
            }

            $organizationId = $organizations->first()->id;
        }
        $homeBranchId = DB::table('branches')
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->orderByRaw("CASE WHEN code = 'HQ' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->value('id');

        DB::table('users')
            ->whereNull('organization_id')
            ->update([
                'organization_id' => $organizationId,
                'home_branch_id' => $homeBranchId,
                'status' => 'active',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // The previous organization assignment cannot be reconstructed safely.
    }
};
