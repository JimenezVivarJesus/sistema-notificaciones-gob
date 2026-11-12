<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Para PostgreSQL (Render): cambiar el tipo ENUM a VARCHAR y normalizar a sin acento
            DB::statement("ALTER TABLE bitacoras ALTER COLUMN tipo_documento_proceso TYPE VARCHAR(255) USING tipo_documento_proceso::text;");
            DB::statement("UPDATE bitacoras SET tipo_documento_proceso = 'ACTA DE NOTIFICACION' WHERE tipo_documento_proceso = 'ACTA DE NOTIFICACIÓN';");
        } else {
            Schema::table('bitacoras', function (Blueprint $table) {
                $table->string('tipo_documento_proceso', 255)->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Se mantiene como VARCHAR
    }
};

