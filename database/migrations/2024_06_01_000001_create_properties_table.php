<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Properties table — core listing data for the EstateLink platform.
     *
     * verification_status tracks admin approval (pending → approved / rejected).
     * transaction_status tracks the deal lifecycle (available → sold).
     * These two statuses are intentionally separate concerns.
     */
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // Property information
            $table->string('title');
            $table->string('property_type', 50);           // apartment, house, land, commercial, etc.
            $table->text('description');
            $table->decimal('price', 15, 2);
            $table->decimal('size', 10, 2);                 // square feet
            $table->unsignedSmallInteger('bedrooms')->nullable();
            $table->unsignedSmallInteger('bathrooms')->nullable();
            $table->string('location');                     // area / city
            $table->text('address');                        // detailed address

            // Verification workflow (admin approval)
            $table->string('verification_status', 20)->default('pending'); // pending | approved | rejected
            $table->text('rejection_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();

            // Transaction / listing lifecycle
            $table->string('transaction_status', 30)->default('available');
            // available | negotiation | meeting_scheduled | agreement_reached | sold

            $table->timestamps();

            // Indexes for common queries
            $table->index('verification_status');
            $table->index('transaction_status');
            $table->index('property_type');
            $table->index(['verification_status', 'transaction_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
