<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage; 
use Illuminate\Support\Facades\Http; 
use App\Models\Notificacion;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Google\Client as GoogleClient;

class NotificacionController extends Controller
{
     // 1. LEER (Listar todas las notificaciones)
    public function index(Request $request)
    {
        // 1. Obtenemos el usuario completo que está logueado en la sesión activa
        $usuarioActivo = auth()->user();

        // 2. Iniciamos la consulta base uniendo la tabla de usuarios (Eager Loading)
        $query = Notificacion::with('user')->orderBy('created_at', 'desc');

        // 3. LA REGLA DE ORO DE SEGURIDAD:
        // Si el rol es 'notificador', lo obligamos a ver únicamente sus propios registros
        if ($usuarioActivo->role === 'notificador') {
            $query->where('user_id', $usuarioActivo->id);
        }
        /*/ Usamos filled() en lugar de has(). filled() verifica que el parámetro exista Y QUE NO ESTÉ VACÍO.
        elseif ($usuarioActivo->role === 'administrador' && $request->filled('empleado_id')) {
            $query->where('user_id', $request->empleado_id);
        }*/
        else if ($usuarioActivo->role === 'administrador') {
        
            // A. Filtro por Empleado (Mantenemos tu función filled() inteligente)
            if ($request->filled('empleado_id')) {
                $query->where('user_id', $request->empleado_id);
            }

            // B. Filtro por Rango de Fechas
            if ($request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
                // Estructuramos el día completo: desde las 00:00:00 del inicio hasta las 23:59:59 del fin
                $inicio = $request->fecha_inicio . ' 00:00:00';
                $fin = $request->fecha_fin . ' 23:59:59';
            
                $query->whereBetween('created_at', [$inicio, $fin]);
            }
        }


        return \Inertia\Inertia::render('Notificaciones/Index', [
            'notificaciones' => $query->get(),
            // Enviamos la lista de empleados (solo ID y Nombre) para poblar el select del Admin
            'empleados' => $usuarioActivo->role === 'administrador' 
                ? User::where('role', 'notificador')->select('id', 'name')->get() 
                : [],
            // Devolvemos todos los filtros actuales para mantener el estado de los inputs en React
            'filtros' => [
                'empleado_id' => $request->query('empleado_id', ''),
                'fecha_inicio' => $request->query('fecha_inicio', ''),
                'fecha_fin' => $request->query('fecha_fin', ''),
            ]
        ]);
    }

    // 2. CREAR (Guardar en la BD)
    public function store(Request $request)
    {
        $validated = $request->validate([
           'usuario' => 'required|string|max:255',
            'codigo_barras' => 'required|string|max:255',
            'estado' => 'required|string|in:notificado,citatorio,acta',
            'proxima_visita' => 'required_if:estado,citatorio|nullable|date',
            'motivo_acta' => 'required_if:estado,acta|nullable|string',
            'numero_visitas' => 'required_if:estado,acta|nullable|integer|min:0|max:3',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg|max:4096',
            'ubicacion_gps' => 'nullable|string|max:255',
        ]);

        $urlFoto = null;

         // Si el usuario subió un archivo físico
        if ($request->hasFile('foto')) {
            $file = $request->file('foto');
        
            // 1. Guardamos el archivo directamente en el disco virtual de Google Drive
            // Esto creará el archivo en tu nube y devolverá la ruta interna
            $path = Storage::disk('google')->putFile('notificaciones_fotos', $file);
        
            // 2. Extraemos la URL pública o el enlace de descarga directa para guardarlo en la base de datos
            $urlFoto = Storage::disk('google')->url($path);
        }   
        

        //Notificacion::create($validated);

        // Guardamos en PostgreSQL de forma tradicional
        Notificacion::create([
        'usuario' => $validated['usuario'],
        'user_id' => auth()->id(),
        'codigo_barras' => $validated['codigo_barras'],
        'estado' => $validated['estado'],
        'proxima_visita' => $validated['proxima_visita'],
        'motivo_acta' => $validated['motivo_acta'],
        'numero_visitas' => $validated['numero_visitas'],
        'url_foto' => $urlFoto,
        'ubicacion_gps' => $validated['ubicacion_gps'],
        ]);

        return redirect()->back(); // Inertia recarga la lista automáticamente sin parpadear
    }



    // 3. ACTUALIZAR
    public function update(Request $request, Notificacion $notificacione)
    {
        $validated = $request->validate([
            'usuario' => 'required|string|max:255',
            'codigo_barras' => 'required|string|max:255',
            'estado' => 'required|string|in:notificado,citatorio,acta',
            'proxima_visita' => 'required_if:estado,citatorio|nullable|date',
            'motivo_acta' => 'required_if:estado,acta|nullable|string',
            'numero_visitas' => 'required_if:estado,acta|nullable|integer|min:1|max:3',
            'url_foto' => 'required_if:estado,acta|nullable|string',
            'ubicacion_gps' => 'nullable|string|max:255',
        ]);

        $notificacion->update($validated);

        return redirect()->back();
    }

    // 4. BORRAR
    public function destroy(Notificacion $notificacione)
    {
        $notificacione->delete();

        return redirect()->back();
    }
}
