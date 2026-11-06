<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Email confirmation (Fig. 3, step 310) starts now. Accounts created before it
 * existed keep working: they are treated as confirmed from this date.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('users')->whereNull('email_verified_at')->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Not reversible: which accounts were confirmed only by this migration is not recorded.
    }
};
