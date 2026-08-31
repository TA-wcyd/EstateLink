<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Property documents — verification documents (NID, ownership proof, etc.).
     * These are PRIVATE and only visible to the property owner and admins.
     * Stored on the local (non-public) disk to prevent direct URL access.
     */
    public function up(): void
    {
        Schema::create('property_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->string('document_type', 50);        // nid | ownership | supporting
            $table->string('document_path', 500);       // relative path within local disk (private)
            $table->string('original_name', 255);       // original uploaded filename
            $table->timestamps();

            $table->index('property_id');
            $table->index('document_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_documents');
    }
};
