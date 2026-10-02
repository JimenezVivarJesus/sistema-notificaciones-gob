<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notificacion extends Model
{
    protected $fillable = ['usuario', 'user_id', 'codigo_barras', 'estado', 'proxima_visita', 'motivo_acta', 'numero_visitas', 'url_foto', 'ubicacion_gps'];

     // Le dice a Laravel que cada notificación "pertenece a" (belongsTo) un Usuario
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
