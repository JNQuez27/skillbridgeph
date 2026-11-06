<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patent Fig. 8, unit 840: the applicant's job preferences feed the preference
 * filter. Empty (null) means "any", so existing applicants see no change.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table) {
            $table->json('preferred_work_setups')->nullable();   // ["Remote", "Hybrid"]
            $table->json('preferred_job_types')->nullable();     // ["Full-time"]
        });
    }

    public function down(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table) {
            $table->dropColumn(['preferred_work_setups', 'preferred_job_types']);
        });
    }
};
