<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every attempt is recorded. Without this there is no way to rate-limit an
 * assessment, and an unlimited-retry multiple-choice test can be brute-forced
 * until it passes - which would make a "verified" badge meaningless.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('applicant_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('score')->default(0);
            $table->boolean('passed')->default(false);
            $table->unsignedInteger('seconds_taken')->nullable();
            $table->timestamps();

            $table->index(['applicant_profile_id', 'company_assessment_id', 'created_at'], 'attempts_rate_limit_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_attempts');
    }
};
