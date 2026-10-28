<?php

namespace App\Http\Controllers;

use App\Models\Area;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AreaController extends Controller
{
    public function store(Request $request)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }

        $request->validate([
            'nombre' => 'required|string|max:255|unique:areas,nombre',
        ]);

        Area::create(['nombre' => strtoupper(trim($request->nombre))]);

        return redirect()->back()->with('success', 'Área de la SEFIN dada de alta con éxito.');
    }

    public function update(Request $request, $id)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }

        $request->validate([
            'nombre' => 'required|string|max:255|unique:areas,nombre,'.$id,
        ]);

        $area = Area::findOrFail($id);
        $area->update(['nombre' => trim($request->nombre)]);

        return redirect()->back()->with('success', 'Área actualizada correctamente.');
    }

    public function destroy($id)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }

        $area = Area::findOrFail($id);
        
        // Impedimos borrar el catálogo si ya tiene documentos asociados para proteger la integridad fiscal
        if ($area->documentos()->count() > 0) {
            return redirect()->back()->withErrors(['error' => 'No se puede eliminar el área porque ya tiene documentos vinculados en el inventario.']);
        }

        $area->delete();
        return redirect()->back()->with('success', 'Área eliminada del catálogo.');
    }
}
