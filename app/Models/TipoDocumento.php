<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoDocumento extends Model
{
    use HasFactory;

    protected $table = 'tipo_documentos';
    protected $fillable = ['nombre'];

    /**
     * Relación: Un Tipo de documento (Oficios, Resoluciones) clasifica a muchos documentos.
     */
    public function documentos(): HasMany
    {
        return $this->hasMany(Documento::class, 'tipo_documento_id');
    }
}
