<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patent Fig. 20 (2022): a portfolio work sample is linked to the skills it
 * shows, so it counts as evidence in the match score (2026).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            $table->json('linked_skills')->nullable();   // skill names, as the applicant holds them
        });
    }

    public function down(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            $table->dropColumn('linked_skills');
        });
    }
};
