<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            // sha256 of the file — detects the same document reused across accounts.
            $table->string('sha256', 64)->nullable()->index()->after('size');
            // File/document metadata captured at upload (producer, dates, page count).
            $table->json('meta')->nullable()->after('sha256');
            // Skills found in the document text, cross-checked against claims.
            $table->json('extracted_skills')->nullable()->after('meta');
            // Challenge code the applicant had to say/show in a demo video.
            $table->string('challenge_code', 32)->nullable()->after('extracted_skills');
        });
    }

    public function down(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            $table->dropColumn(['sha256', 'meta', 'extracted_skills', 'challenge_code']);
        });
    }
};
