<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Onboarding step 2 ("Where do you want to go?"): expected pay and when the applicant can start. */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table) {
            $table->string('expected_salary', 60)->nullable();   // free text, e.g. "₱25,000 - ₱35,000"
            $table->string('availability', 60)->nullable();      // e.g. "Ready within 30 days"
        });
    }

    public function down(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table) {
            $table->dropColumn(['expected_salary', 'availability']);
        });
    }
};
