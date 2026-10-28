<?php

namespace App\Http\Controllers;

use App\Models\TipoDocumento;
use Illuminate\Http\Request;

class TipoDocumentoController extends Controller
{
    public function store(Request $request)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }

        $request->validate([
            'nombre' => 'required|string|max:255|unique:tipo_documentos,nombre',
        ]);

        TipoDocumento::create(['nombre' => strtoupper(trim($request->nombre))]);
        return redirect()->back()->with('success', 'Tipo de documento registrado.');
    }

    public function update(Request $request, $id)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }

        $request->validate([
            'nombre' => 'required|string|max:255|unique:tipo_documentos,nombre,'.$id,
        ]);

        $tipo = TipoDocumento::findOrFail($id);
        $tipo->update(['nombre' => trim($request->nombre)]);
        return redirect()->back()->with('success', 'Tipo de documento actualizado.');
    }

    public function destroy($id)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }

        $tipo = TipoDocumento::findOrFail($id);

        if ($tipo->documentos()->count() > 0) {
            return redirect()->back()->withErrors(['error' => 'No se puede eliminar porque ya clasifica a oficios existentes.']);
        }

        $tipo->delete();
        return redirect()->back()->with('success', 'Tipo de documento removido.');
    }
}
