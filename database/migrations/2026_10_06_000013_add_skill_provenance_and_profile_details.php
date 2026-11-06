<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Provenance for every verified skill: who issued it and on what evidence, so a
 * badge is never just a word on a profile. Plus the self-reported education and
 * experience onboarding already asks for, which used to be thrown away.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->string('verified_by')->nullable();          // issuing company
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('evidence_credential_id')->nullable()->constrained('credentials')->nullOnDelete();
        });

        Schema::table('applicant_profiles', function (Blueprint $table) {
            $table->json('education')->nullable();
            $table->json('experience')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->dropConstrainedForeignId('evidence_credential_id');
            $table->dropColumn(['verified_by', 'verified_at']);
        });

        Schema::table('applicant_profiles', function (Blueprint $table) {
            $table->dropColumn(['education', 'experience']);
        });
    }
};
