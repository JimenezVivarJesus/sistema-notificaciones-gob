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
        Schema::table('users', function (Blueprint $table) {
            // Un usuario puede pertenecer a un Área de Origen o a un código CIAC regional
            $table->foreignId('area_id')->nullable()->after('role')->constrained('areas')->nullOnDelete();
            $table->foreignId('ciac_id')->nullable()->after('area_id')->constrained('ciacs')->nullOnDelete();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};
