<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('applicant_profile_id')->constrained()->cascadeOnDelete();
            // flagged = autonomous match surfaced to the applicant but not yet acted on
            $table->string('status')->default('flagged'); // flagged | saved | applied | shortlisted | interviewing | hired
            $table->unsignedTinyInteger('match_score')->default(0);
            $table->timestamps();
            $table->unique(['job_post_id', 'applicant_profile_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
