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
        Schema::create('user_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('reported_user_id')->constrained('users')->onDelete('cascade');
            $table->string('reason'); // Fraud/Scam, Fake Listing, Abusive Behavior, Impersonation, Other
            $table->text('description');
            $table->string('proof_path')->nullable(); // Uploaded file in storage/app/public/reports/
            $table->string('status')->default('pending'); // pending, resolved_banned, dismissed
            $table->text('admin_notes')->nullable();
            $table->foreignId('actioned_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('actioned_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_reports');
    }
};
