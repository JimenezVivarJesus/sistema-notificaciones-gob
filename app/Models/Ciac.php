<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ciac extends Model
{
    use HasFactory;

    protected $table = 'ciacs';
    protected $fillable = ['nombre'];

    /**
     * Relación: Un CIAC puede tener "n" cantidad de documentos a su cargo.
     */
    public function documentos(): HasMany
    {
        return $this->hasMany(Documento::class, 'ciac_id');
    }
}