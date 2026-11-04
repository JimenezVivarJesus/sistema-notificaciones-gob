<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;


class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;


    protected $fillable = [
        'name',
        'email',
        'password',
        'role', 
        'activo', 
        'area_id',
        'ciac_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function notificaciones()
    {
        return $this->hasMany(Notificacion::class);
    }

    /**
    * Relación: Un notificador tiene bajo su cargo actual muchos documentos pendientes.
    */
    public function documentosActuales(): HasMany
    {
        return $this->hasMany(Documento::class, 'user_id');
    }

    /**
    * Relación: Un usuario ha estampado su firma y acciones en muchas filas de la bitácora.
    */
    public function accionesBitacora(): HasMany
    {
        return $this->hasMany(Bitacora::class, 'user_id');
    }

    public function area() {
        return $this->belongsTo(Area::class, 'area_id');
    }

    public function ciac() {
        return $this->belongsTo(Ciac::class, 'ciac_id');
    }

}
