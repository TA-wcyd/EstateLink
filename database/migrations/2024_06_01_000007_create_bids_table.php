<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Bids table: Immutable ledger of every bid placed.
     */
    public function up(): void
    {
        Schema::create('bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_id')->constrained('auctions')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // buyer
            
            $table->decimal('amount', 15, 2);
            $table->unsignedInteger('bidder_number')->default(1); // masked sequential index for this auction
            $table->boolean('is_direct_offer')->default(false);
            $table->timestamp('placed_at');
            $table->timestamps();

            $table->index(['auction_id', 'amount']);
            $table->index(['auction_id', 'user_id']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bids');
    }
};
