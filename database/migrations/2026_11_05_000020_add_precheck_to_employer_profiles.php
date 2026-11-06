<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Patent Fig. 5, step 530: the automatic pre-check result shown to the reviewing admin. */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('employer_profiles', function (Blueprint $table) {
            $table->json('precheck')->nullable();
            $table->timestamp('precheck_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('employer_profiles', fn (Blueprint $table) => $table->dropColumn(['precheck', 'precheck_at']));
    }
};
