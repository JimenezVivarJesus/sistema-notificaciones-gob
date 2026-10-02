<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class UsuarioController extends Controller
{
    // 1. LISTAR USUARIOS
    public function index()
    {
        // SEGURIDAD AUTOMÁTICA: Si no es admin, lo expulsamos de inmediato
        if (auth()->user()->role !== 'administrador') {
            abort(403, 'Acceso denegado. Solo administradores.');
        }

        return Inertia::render('Usuarios/Index', [
            // Listamos todos los usuarios excepto al administrador actual para que no se borre a sí mismo por error
            'usuarios' => User::where('id', '!=', auth()->id())->orderBy('name', 'asc')->get()
        ]);
    }

    // 2. CREAR NUEVO USUARIO
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', Rules\Password::defaults()],
            'role' => 'required|string|in:administrador,notificador',
        ]);

        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'activo' => true
        ]);

        return redirect()->back();
    }

    public function update(Request $request, $id) // <-- CAMBIAMOS EL PARÁMETRO A $id
{
    // 1. Buscamos al usuario de forma manual en PostgreSQL (A prueba de fallos de inyección)
    $usuario = User::findOrFail($id);

    // 2. Ejecutamos la validación tradicional
    $rules = [
        'name' => 'required|string|max:255',
        'email' => 'required|string|email|max:255|unique:users,email,' . $usuario->id,
        'role' => 'required|string|in:administrador,notificador',
        'activo' => 'required|boolean',
    ];

    if ($request->filled('password')) {
        $rules['password'] = ['required', Rules\Password::defaults()];
    }

    $validated = $request->validate($rules);

    // 3. Asignamos los campos básicos
    $usuario->name = $request->name;
    $usuario->email = $request->email;
    $usuario->role = $request->role;
    $usuario->activo = $request->activo;

    // 4. CRUCIAL: Si el Administrador digitó una clave, la encriptamos y la inyectamos directamente
    if ($request->filled('password')) {
        $usuario->password = Hash::make($request->password);
    }

    // 5. Guardamos los cambios de forma persistente en PostgreSQL
    $usuario->save();

    return redirect()->back();
}

    // 4. ELIMINAR USUARIO
    public function destroy(User $usuario)
    {
        $usuario->delete();
        return redirect()->back();
    }
}
