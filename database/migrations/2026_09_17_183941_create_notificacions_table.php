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
        Schema::create('notificacions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); 
            $table->string('usuario');
            $table->string('codigo_barras');
            $table->string('estado');
            $table->date('proxima_visita')->nullable();
            $table->text('motivo_acta')->nullable();;
            $table->integer('numero_visitas')->default(1);
            $table->string('url_foto')->nullable();
            $table->string('ubicacion_gps');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notificacions');
    }
};
