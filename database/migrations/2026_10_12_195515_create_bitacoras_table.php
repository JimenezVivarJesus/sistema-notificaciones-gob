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
        Schema::create('bitacoras', function (Blueprint $table) {
            $table->id();
            // Composición: Si se elimina un documento, se borra su historial en cascada
            $table->foreignId('documento_id')->constrained('documentos')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
        
            $table->string('estatus_registrado');
            // Valores del catálogo oficial del proceso exigidos en el Excel
            $table->enum('tipo_documento_proceso', ['CITATORIO', 'ACTA DE NOTIFICACIÓN', 'ACTA CIRCUNSTANCIADA'])->nullable();
        
            $table->dateTime('hora_inicio_visita')->nullable();
            $table->dateTime('hora_fin_visita')->nullable();
            $table->integer('minutos_permanencia')->nullable();
        
            $table->string('ubicacion_gps')->nullable();
            $table->string('url_foto')->nullable();
            $table->text('observaciones_operativas')->nullable();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bitacoras');
    }
};
