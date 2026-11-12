<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // 1. Eliminar constraint de check específico generado por Laravel
            DB::statement("ALTER TABLE bitacoras DROP CONSTRAINT IF EXISTS bitacoras_tipo_documento_proceso_check;");

            // 2. Eliminar cualquier otro check constraint en la columna tipo_documento_proceso
            DB::statement("
                DO $$ 
                DECLARE 
                    r RECORD;
                BEGIN
                    FOR r IN (
                        SELECT conname 
                        FROM pg_constraint 
                        WHERE conrelid = 'bitacoras'::regclass 
                          AND contype = 'c' 
                          AND conname LIKE '%tipo_documento_proceso%'
                    ) LOOP
                        EXECUTE 'ALTER TABLE bitacoras DROP CONSTRAINT ' || quote_ident(r.conname);
                    END LOOP;
                END $$;
            ");

            // 3. Garantizar que la columna sea tipo VARCHAR(255) nullable
            DB::statement("ALTER TABLE bitacoras ALTER COLUMN tipo_documento_proceso TYPE VARCHAR(255) USING tipo_documento_proceso::text;");
            DB::statement("ALTER TABLE bitacoras ALTER COLUMN tipo_documento_proceso DROP NOT NULL;");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revertir
    }
};

