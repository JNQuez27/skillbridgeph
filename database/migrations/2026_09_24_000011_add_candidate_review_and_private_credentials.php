<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('review_mode')->nullable();      // auto | manual
            $table->string('review_verdict')->nullable();   // green | amber | red at time of review
            $table->json('reviewed_credentials')->nullable();
        });

        // Credentials were world-readable under storage/app/public. Move them to
        // private storage; they are now served only through an authorized route.
        foreach (DB::table('credentials')->get() as $c) {
            if ($c->path && Storage::disk('public')->exists($c->path)) {
                Storage::disk('local')->put($c->path, Storage::disk('public')->get($c->path));
                Storage::disk('public')->delete($c->path);
            }
        }
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['reviewed_at', 'review_mode', 'review_verdict', 'reviewed_credentials']);
        });
    }
};
