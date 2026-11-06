<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patent Fig. 21 (2106): a badge can have a shareable verification link. It is
 * off until the holder turns it on (RA 10173: their name is shown on the page).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->timestamp('public_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->dropColumn('public_at');
        });
    }
};
