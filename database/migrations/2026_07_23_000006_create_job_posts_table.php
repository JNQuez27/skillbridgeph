<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('job_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('responsibilities')->nullable();
            $table->string('location_city')->nullable();
            $table->string('location_region')->nullable();
            $table->string('employment_type')->default('Full-time');
            $table->string('work_setup')->default('On-site');
            $table->string('salary_range')->nullable();
            $table->string('experience_level')->default('Entry');
            $table->string('education_requirement')->nullable();
            $table->json('required_skills')->nullable();
            $table->json('preferred_skills')->nullable();
            $table->string('status')->default('Open'); // Open | Closed
            $table->date('closing_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_posts');
    }
};
