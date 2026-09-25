<?php

use App\Enums\PropertyRequestStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PRIVACY RULE ENFORCEMENT:
     * No phone, email, WhatsApp, or contact numbers are stored on this table.
     * All identification is strictly relational (buyer_id, seller_id) and
     * masked appropriately in API representations.
     */
    public function up(): void
    {
        Schema::create('property_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->foreignId('buyer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');

            // Buyer's offer and preferred inspection date
            $table->decimal('offered_amount', 15, 2);
            $table->date('preferred_date');
            $table->text('buyer_notes')->nullable();

            // Seller decision notes
            $table->text('seller_notes')->nullable();

            // Workflow status (state machine)
            $table->string('status', 40)->default(PropertyRequestStatus::PENDING_SELLER_APPROVAL->value);

            // Step 3: Admin Inspection Schedule
            $table->dateTime('inspection_scheduled_at')->nullable();
            $table->text('inspection_notes')->nullable();

            // Step 4: Admin Inspection Conducted & Findings
            $table->dateTime('inspection_completed_at')->nullable();
            $table->text('inspection_findings')->nullable();

            // Step 5: Final Decision (Sale Confirmed vs Cancelled)
            $table->dateTime('sale_confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->dateTime('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('cancellation_reason')->nullable();

            $table->timestamps();

            // Indexes for fast status lookups and constraint checking
            $table->index(['property_id', 'status']);
            $table->index(['buyer_id', 'status']);
            $table->index(['seller_id', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_requests');
    }
};
