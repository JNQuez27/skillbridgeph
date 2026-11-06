<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demo videos are recorded in SkillBridge against prompts revealed live at
 * random moments, and only count after a live interview confirms the same
 * person can do the task.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            // [{at: seconds, kind: code|action, text}] in the order they were shown.
            $table->json('recording_prompts')->nullable();
            $table->timestamp('recording_started_at')->nullable();
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->string('video_identity', 12)->nullable(); // match | mismatch
            $table->boolean('live_task_done')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('applications', fn (Blueprint $table) => $table->dropColumn(['video_identity', 'live_task_done']));
        Schema::table('credentials', fn (Blueprint $table) => $table->dropColumn(['recording_prompts', 'recording_started_at']));
    }
};
