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
        Schema::table('documentos', function (Blueprint $table) {
            // Añadimos las referencias como texto largo opcional (nullable)
            $table->text('referencias_domicilio')->nullable()->after('domicilio_contribuyente');

            // Modificamos las columnas de folios para que acepten valores nulos a nivel BD
            $table->string('numero_control')->nullable()->change();
            $table->string('numero_oficio')->nullable()->change();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            //
        });
    }
};
