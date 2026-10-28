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
        Schema::create('ciacs', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique(); // Ej: 'CIAC-OAX-01'
            $table->timestamps();
        });

        Schema::table('documentos', function (Blueprint $table) {
            // Creamos la llave foránea física en documentos para indexar búsquedas
            $table->foreignId('ciac_id')->nullable()->after('numero_oficio')->constrained('ciacs')->nullOnDelete();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ciacs');
    }
};
