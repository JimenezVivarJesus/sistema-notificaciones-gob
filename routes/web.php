<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\DocumentoController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\AreaController;
use App\Http\Controllers\TipoDocumentoController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\Area;
use App\Models\TipoDocumento;
use App\Http\Controllers\NotificadorController;


/*Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});*/

Route::redirect('/', '/login');

/*Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');*/

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth'])->group(function () {
    Route::resource('notificaciones', NotificacionController::class);
    Route::resource('usuarios', UsuarioController::class);

    Route::get('/dashboard', [DocumentoController::class, 'index'])->name('dashboard');

    //Abre la pantalla independiente de carga individual y masiva
    Route::get('/documentos/cargar', [DocumentoController::class, 'mostrarFormularioCarga'])->name('documentos.cargar');
    
    // Rutas de acciones de documentos
    Route::post('/documentos', [DocumentoController::class, 'store'])->name('documentos.store');
    Route::put('/documentos/{id}', [DocumentoController::class, 'update'])->name('documentos.update');
    Route::delete('/documentos/{id}', [DocumentoController::class, 'destroy'])->name('documentos.destroy');
    Route::post('/documentos/cargar-masivo', [DocumentoController::class, 'cargarMasivo'])->name('documentos.cargarMasivo');
    Route::post('/documentos/asignar-masivo', [DocumentoController::class, 'asignarMasivo'])->name('documentos.asignarMasivo');

    // Rutas de catálogos
    Route::get('/catalogos', function () {
        if (auth()->user()->role !== 'administrador') { abort(403); }
        return Inertia::render('Catalogo/Index', [
            'areas' => Area::orderBy('nombre', 'asc')->get(),
            'tiposDocumento' => TipoDocumento::orderBy('nombre', 'asc')->get()
        ]);
    })->name('catalogos.index');

    Route::post('/areas', [AreaController::class, 'store'])->name('areas.store');
    Route::put('/areas/{id}', [AreaController::class, 'update'])->name('areas.update');
    Route::delete('/areas/{id}', [AreaController::class, 'destroy'])->name('areas.destroy');

    Route::post('/tipo-documentos', [TipoDocumentoController::class, 'store'])->name('tipoDocumentos.store');
    Route::put('/tipo-documentos/{id}', [TipoDocumentoController::class, 'update'])->name('tipoDocumentos.update');
    Route::delete('/tipo-documentos/{id}', [TipoDocumentoController::class, 'destroy'])->name('tipoDocumentos.destroy');
    // Ruta para consultar la ficha técnica y línea de tiempo de un oficio específico
    Route::get('/documentos/{id}', [DocumentoController::class, 'show'])->name('documentos.show');

    ////RUTAS PARA APP MOVIL/////
    Route::get('/notificador/agenda', [NotificadorController::class, 'agenda'])->name('notificador.agenda');
    // Ruta que recibe el formulario binario del notificador en territorio
    Route::post('/documentos/{id}/registrar-visita', [DocumentoController::class, 'registrarVisita'])->name('documentos.registrarVisita');



});

require __DIR__.'/auth.php';
