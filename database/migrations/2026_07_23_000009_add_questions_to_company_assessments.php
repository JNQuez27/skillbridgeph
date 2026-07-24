<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('company_assessments', function (Blueprint $table) {
            $table->string('industry')->nullable()->after('role');
            $table->string('skill')->nullable()->after('industry'); // the badge/skill this assessment verifies
            $table->json('questions')->nullable()->after('instructions');
        });
    }

    public function down(): void
    {
        Schema::table('company_assessments', function (Blueprint $table) {
            $table->dropColumn(['industry', 'skill', 'questions']);
        });
    }
};
