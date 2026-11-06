<?php

use App\Models\ApplicantSkill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fig. 4, step 435: every verified badge carries a unique verification ID, so a
 * badge can be quoted and checked on its own.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->string('verification_id', 20)->nullable()->unique();
        });

        DB::table('applicant_skills')->where('verification_status', 'verified')->whereNull('verification_id')
            ->pluck('id')->each(fn ($id) => DB::table('applicant_skills')->where('id', $id)
                ->update(['verification_id' => ApplicantSkill::newVerificationId()]));
    }

    public function down(): void
    {
        Schema::table('applicant_skills', function (Blueprint $table) {
            $table->dropUnique(['verification_id']);
            $table->dropColumn('verification_id');
        });
    }
};
