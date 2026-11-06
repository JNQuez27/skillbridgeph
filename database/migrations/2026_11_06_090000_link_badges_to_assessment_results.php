<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Patent Fig. 1: each skill badge record (142) is linked to the assessment
 * result (144) that earned it, so every badge traces back to its proof.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->foreignId('assessment_attempt_id')->nullable()->constrained('assessment_attempts')->nullOnDelete();
        });

        // Existing assessment badges: link the best passed attempt for that skill.
        DB::table('applicant_skills')->where('verification_method', 'assessment')->orderBy('id')
            ->each(function ($skill) {
                $attempt = DB::table('assessment_attempts')
                    ->join('company_assessments', 'company_assessments.id', '=', 'assessment_attempts.company_assessment_id')
                    ->where('assessment_attempts.applicant_profile_id', $skill->applicant_profile_id)
                    ->where('assessment_attempts.passed', true)
                    ->whereRaw('LOWER(company_assessments.skill) = ?', [mb_strtolower($skill->name)])
                    ->orderByDesc('assessment_attempts.score')
                    ->value('assessment_attempts.id');
                if ($attempt) {
                    DB::table('applicant_skills')->where('id', $skill->id)->update(['assessment_attempt_id' => $attempt]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assessment_attempt_id');
        });
    }
};
