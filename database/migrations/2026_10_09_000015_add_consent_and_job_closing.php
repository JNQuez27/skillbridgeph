<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Consent (Data Privacy Act, RA 10173): when a user accepted the privacy notice,
 * and when an applicant agreed to a certificate being looked up in a government
 * registry. Plus how a job post ended, so stale "ghost" posts stop showing.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('privacy_accepted_at')->nullable();
        });

        Schema::table('credentials', function (Blueprint $table) {
            $table->timestamp('registry_consent_at')->nullable();
        });

        Schema::table('job_posts', function (Blueprint $table) {
            $table->string('closed_reason', 16)->nullable(); // filled | cancelled
            $table->timestamp('closed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('job_posts', fn (Blueprint $table) => $table->dropColumn(['closed_reason', 'closed_at']));
        Schema::table('credentials', fn (Blueprint $table) => $table->dropColumn('registry_consent_at'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('privacy_accepted_at'));
    }
};
