<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone');
            $table->string('email')->unique();
            $table->string('national_id')->unique();
            $table->string('password');
            $table->string('facebook_url')->nullable();
            $table->string('company_name')->nullable();
            $table->string('role')->default('user'); // 'user' or 'admin'
            // Future-proofing: verification_status for admin approval workflow
            $table->string('verification_status')->default('pending'); // pending | verified | rejected
            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
