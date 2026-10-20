<?php

namespace App\Http\Controllers;

use App\Models\Documento;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificadorController extends Controller
{
    /**
     * Despliega la agenda de trabajo móvil del notificador logueado.
     */
    public function agenda()
    {
        // Candado de seguridad: Evita que administradores entren a la interfaz móvil por error
        if (auth()->user()->role !== 'notificador') {
            abort(403, 'Acceso exclusivo para personal de notificaciones en campo.');
        }

        return Inertia::render('Notificador/Agenda', [
            // Jalamos solo sus documentos pendientes, optimizando las columnas para el plan de datos móvil
            'documentos' => Documento::where('user_id', auth()->id())
                ->where('estatus', '!=', 'NOTIFICADO') // Solo lo que tiene pendiente por trabajar
                ->with(['area', 'tipoDocumento'])
                ->orderBy('fecha_documento', 'asc')
                ->get()
        ]);
    }
}
