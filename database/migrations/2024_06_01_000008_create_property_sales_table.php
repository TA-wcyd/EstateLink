<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Property Sales table: Transaction record linked to properties, auctions, buyers and sellers.
     */
    public function up(): void
    {
        Schema::create('property_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->foreignId('auction_id')->nullable()->constrained('auctions')->nullOnDelete();
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('buyer_id')->constrained('users')->onDelete('cascade');
            $table->decimal('final_price', 15, 2);
            $table->timestamp('sold_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('property_id');
            $table->index('seller_id');
            $table->index('buyer_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_sales');
    }
};
