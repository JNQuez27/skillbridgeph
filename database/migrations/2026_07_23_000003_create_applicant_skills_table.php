<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('applicant_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('applicant_profile_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('level')->default(50);
            $table->string('badge')->nullable();
            $table->string('verification_status')->default('pending'); // verified | pending
            $table->string('verification_method')->default('assessment'); // assessment | scenario | portfolio
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applicant_skills');
    }
};
