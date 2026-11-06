<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patent Fig. 6: each listed skill carries a weight and a minimum level (610),
 * and a job can have an assessment attached (615-620).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('job_posts', function (Blueprint $table) {
            // {"react": {"weight": 5, "minLevel": 70}, ...} keyed by lower-case skill name.
            $table->json('skill_settings')->nullable();
            $table->foreignId('company_assessment_id')->nullable()->constrained('company_assessments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('job_posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_assessment_id');
            $table->dropColumn('skill_settings');
        });
    }
};
