<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The structured interview recorded on the application: each question as it was
 * asked (snapshotted, so later edits to the question bank never change an old
 * score), its 1-5 rating and note, the average, and who interviewed and when.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->json('interview_ratings')->nullable();
            $table->decimal('interview_score', 3, 2)->nullable();
            $table->foreignId('interviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('interviewed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('interviewed_by');
            $table->dropColumn(['interview_ratings', 'interview_score', 'interviewed_at']);
        });
    }
};
