<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('company_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('role')->nullable();
            $table->unsignedInteger('question_count')->default(10);
            $table->unsignedInteger('duration_minutes')->default(20);
            $table->unsignedTinyInteger('passing_score')->default(70);
            $table->text('instructions')->nullable();
            $table->string('status')->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_assessments');
    }
};
