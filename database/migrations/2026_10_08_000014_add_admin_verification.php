<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Who checked what, and against which official source. A company is verified
 * against its DTI/SEC registration; a certificate against the TESDA or PRC
 * registry. Each check is done once by a SkillBridge admin and every employer
 * sees the same recorded result.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('employer_profiles', function (Blueprint $table) {
            $table->string('registration_type', 8)->nullable();      // DTI | SEC
            $table->string('registration_number', 40)->nullable();
            $table->string('verification_status', 16)->default('unsubmitted'); // unsubmitted | pending | approved | rejected
            $table->text('verification_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
        });

        // Companies already trusted before this check existed stay trusted.
        DB::table('employer_profiles')->where('email_verified', true)->update(['verification_status' => 'approved']);

        Schema::table('credentials', function (Blueprint $table) {
            $table->string('registry', 8)->nullable();               // tesda | prc
            $table->string('registry_number', 40)->nullable();
            $table->string('registry_qualification', 120)->nullable();
            $table->string('registry_status', 16)->nullable();       // pending | verified | rejected
            $table->text('registry_note')->nullable();
            $table->foreignId('registry_checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('registry_checked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registry_checked_by');
            $table->dropColumn(['registry', 'registry_number', 'registry_qualification', 'registry_status', 'registry_note', 'registry_checked_at']);
        });

        Schema::table('employer_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['registration_type', 'registration_number', 'verification_status', 'verification_note', 'reviewed_at']);
        });
    }
};
