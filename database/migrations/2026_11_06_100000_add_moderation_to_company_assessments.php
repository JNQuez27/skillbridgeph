<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patent Fig. 2, 232: the administrator portal moderates assessments. A
 * suspended assessment ('Suspended') stops issuing badges; the reason, who
 * decided and when are kept.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('company_assessments', function (Blueprint $table) {
            $table->text('moderation_note')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('company_assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('moderated_by');
            $table->dropColumn(['moderation_note', 'moderated_at']);
        });
    }
};
