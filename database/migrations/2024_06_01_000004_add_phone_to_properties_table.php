<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add phone column to properties table so sellers can specify contact phone number for each listing.
     */
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};
