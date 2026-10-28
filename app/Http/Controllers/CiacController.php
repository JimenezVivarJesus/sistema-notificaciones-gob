<?php

namespace App\Http\Controllers;

use App\Models\Ciac;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CiacController extends Controller
{

    /**
     * Almacena un nuevo código CIAC en PostgreSQL con validación estricta de unicidad.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre'      => 'required|string|max:255|unique:ciacs,nombre',
        ], [
            'nombre.unique' => 'Este nombre de CIAC ya se encuentra registrado en el sistema de la SEFIN.',
        ]);

        Ciac::create([
            'nombre' => strtoupper(trim($request->nombre)),
        ]);

        return redirect()->back()->with('success', 'Código CIAC dado de alta correctamente.');
    }

    /**
     * Actualiza las propiedades de un código CIAC existente.
     */
    public function update(Request $request, $id)
    {
        $ciac = Ciac::findOrFail($id);

        $request->validate([
            // Validamos unicidad ignorando el ID del registro que estamos editando actualmente
            'nombre'      => 'required|string|max:255|unique:ciacs,nombre,' . $id,
        ]);

        $ciac->update([
            'nombre' => trim($request->nombre),
        ]);

        return redirect()->back()->with('success', 'Nombre CIAC actualizado de forma exitosa.');
    }

    /**
     * Elimina un código CIAC del catálogo. 
     * Gracias a la regla 'nullOnDelete' de la migración, los documentos vinculados no se borran.
     */
    public function destroy($id)
    {
        $ciac = Ciac::findOrFail($id);
        $ciac->delete();

        return redirect()->back()->with('success', 'El CIAC ha sido removido del sistema.');
    }
}
