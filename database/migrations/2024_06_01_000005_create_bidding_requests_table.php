<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Bidding requests table: Sellers request admin approval to host an auction.
     */
    public function up(): void
    {
        Schema::create('bidding_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // seller
            
            $table->decimal('start_price', 15, 2);
            $table->decimal('min_increment', 15, 2);
            $table->unsignedInteger('duration_hours'); // auction duration in hours
            
            // Status: pending, approved, rejected
            $table->string('status', 20)->default('pending');
            $table->text('admin_note')->nullable();
            
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            
            $table->timestamps();

            $table->index(['property_id', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bidding_requests');
    }
};
