<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patent Figs. 13 and 16 (and Fig. 4, step 425): an assessment can carry a
 * practical task with a work-file upload, scored by the employer's rubric.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('company_assessments', function (Blueprint $table) {
            $table->text('task_prompt')->nullable();
            $table->boolean('task_file_required')->default(false);
            $table->json('rubric')->nullable();   // [{"criterion": "...", "points": 5}, ...]
        });

        Schema::table('assessment_attempts', function (Blueprint $table) {
            // 'scored' (final) or 'pending_review' (task waiting for the rubric).
            $table->string('status')->default('scored');
            $table->unsignedTinyInteger('mcq_score')->nullable();
            $table->text('task_answer')->nullable();
            $table->string('task_file_path')->nullable();
            $table->string('task_file_name')->nullable();
            $table->json('rubric_scores')->nullable();   // points per criterion, same order as the rubric
            $table->text('feedback')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('assessment_attempts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['status', 'mcq_score', 'task_answer', 'task_file_path', 'task_file_name', 'rubric_scores', 'feedback', 'reviewed_at']);
        });
        Schema::table('company_assessments', function (Blueprint $table) {
            $table->dropColumn(['task_prompt', 'task_file_required', 'rubric']);
        });
    }
};
