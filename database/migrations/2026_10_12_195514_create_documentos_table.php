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
        Schema::create('documentos', function (Blueprint $table) {
            $table->id();
            // Llaves foráneas con eliminación restrictiva para proteger la información fiscal
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('area_id')->constrained('areas')->onDelete('restrict');
            $table->foreignId('tipo_documento_id')->constrained('tipo_documentos')->onDelete('restrict');
        
            $table->string('numero_control')->nullable();;
            $table->string('numero_oficio')->nullable();;
            $table->string('rfc_contribuyente', 13);
            $table->string('razon_social_contribuyente');
            $table->text('domicilio_contribuyente'); // Usamos text por si la dirección es muy larga
            $table->date('fecha_documento');
            $table->string('estatus')->default('PENDIENTE POR NOTIFICAR');
            $table->string('ciac_asignado')->nullable();
        
            $table->dateTime('fecha_primera_asignacion')->nullable();
            $table->dateTime('fecha_ultima_asignacion')->nullable();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documentos');
    }
};
