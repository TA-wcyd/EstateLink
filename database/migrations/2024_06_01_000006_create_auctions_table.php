<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Auctions table: Live and historical auction events.
     */
    public function up(): void
    {
        Schema::create('auctions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->foreignId('bidding_request_id')->nullable()->constrained('bidding_requests')->nullOnDelete();
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');
            
            $table->decimal('start_price', 15, 2);
            $table->decimal('min_increment', 15, 2);
            $table->timestamp('start_time');
            $table->timestamp('end_time');
            
            // Status: active, awaiting_seller_confirmation, sold, cancelled, expired
            $table->string('status', 35)->default('active');
            
            // Winning bid reference (set upon expiry/resolution)
            $table->unsignedBigInteger('winning_bid_id')->nullable();
            
            $table->text('seller_notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index(['property_id', 'status']);
            $table->index(['status', 'end_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auctions');
    }
};
