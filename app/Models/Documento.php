<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Documento extends Model
{
    use HasFactory;

    protected $table = 'documentos';


    protected $fillable = [
        'user_id',
        'area_id',
        'tipo_documento_id',
        'numero_control',
        'numero_oficio',
        'rfc_contribuyente',
        'razon_social_contribuyente',
        'domicilio_contribuyente',
        'fecha_documento',
        'estatus',
        'ciac_id',
        'fecha_primera_asignacion',
        'fecha_ultima_asignacion',
        'referencias_domicilio'
    ];

    // Formateamos las fechas automáticamente a objetos Carbon de Laravel
    protected $casts = [
        'fecha_documento' => 'date:Y-m-d',
        'fecha_primera_asignacion' => 'datetime',
        'fecha_ultima_asignacion' => 'datetime',
    ];

    /**
     * Relación: Un documento pertenece a un Notificador Actual (Usuario).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relación: Un documento pertenece al Área de Sefin que lo originó.
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_id');
    }

    /**
     * Relación: Un documento pertenece a una clasificación de tipo de documento.
     */
    public function tipoDocumento(): BelongsTo
    {
        return $this->belongsTo(TipoDocumento::class, 'tipo_documento_id');
    }

    /**
    * Relación: Un documento pertenece a un código CIAC específico.
    */
    public function ciac()
    {
        return $this->belongsTo(Ciac::class, 'ciac_id');
    }

    /**
     * Relación: Un documento tiene muchos movimientos registrados en su bitácora.
     */
    public function bitacora(): HasMany
    {
        return $this->hasMany(Bitacora::class, 'documento_id')->orderBy('created_at', 'desc');
    }
}
