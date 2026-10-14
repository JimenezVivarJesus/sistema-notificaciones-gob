<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bitacora extends Model
{
    use HasFactory;

    protected $table = 'bitacoras';

    protected $fillable = [
        'documento_id',
        'user_id',
        'estatus_registrado',
        'tipo_documento_proceso',
        'hora_inicio_visita',
        'hora_fin_visita',
        'minutos_permanencia',
        'ubicacion_gps',
        'url_foto',
        'observaciones_operativas'
    ];

    // Formateamos las fechas automáticamente a objetos Carbon de Laravel
    protected $casts = [
        'hora_inicio_visita' => 'datetime',
        'hora_fin_visita' => 'datetime',
        'minutos_permanencia' => 'integer',
    ];

    /**
     * Relación: Un registro de bitácora pertenece a un único documento madre.
     */
    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    /**
     * Relación: Un registro de bitácora fue generado por un Notificador (Usuario).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
