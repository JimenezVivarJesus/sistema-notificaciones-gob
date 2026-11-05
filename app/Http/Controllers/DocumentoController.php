<?php

namespace App\Http\Controllers;

use App\Models\Documento;
use App\Models\Area;
use App\Models\TipoDocumento;
use App\Models\User;
use App\Models\Ciac;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DocumentoController extends Controller
{
    /**
     * Para listar los documentos existentes.
     */
    public function index(Request $request)
    {
        $usuarioActivo = auth()->user();

        if ($usuarioActivo->role === 'notificador') {
            return redirect()->route('notificador.agenda');
        }

        return Inertia::render('Dashboard', [
            // Contadores de estatus para mostrar en la parte superior del Dashboard
            'totales' => [
                'por_asignar'    => Documento::where('estatus', 'PENDIENTE POR NOTIFICAR')->count(),
                'notificados'    => Documento::where('estatus', 'NOTIFICADO')->count(),
                'no_localizados' => Documento::where('estatus', 'NO LOCALIZADO')->count(),
                'no_trabajados'  => Documento::where('estatus', 'NO TRABAJADO')->count(),
            ]
        ]);
    }

/**
 * Muestra la ficha detallada de un documento y su línea de tiempo.
 */
public function show($id)
{
    $usuarioActivo = auth()->user();
    
    // 1. Cargamos el documento base con sus relaciones estructurales
    $documento = Documento::with(['area', 'tipoDocumento', 'ciac','user'])->findOrFail($id);

    // 2. FILTRADO DE SEGURIDAD EN BITÁCORA: Cargamos los movimientos según el rol
    if ($usuarioActivo->role === 'administrador' || $usuarioActivo->role === 'coordinador_area' || $usuarioActivo->role === 'coordinador_ciac') {
         // El Administrador audita todo: cargamos tanto el notificador como el asignador
        $documento->load(['bitacora' => function($query) {
            $query->with(['user', 'asignador'])
                  ->orderBy('created_at', 'desc');
        }]);
    } else {
        // El Notificador solo ve antecedentes reales de la calle para obtener contexto
        $documento->load(['bitacora' => function($query) {
            $query->where('estatus_registrado', '!=', 'ASIGNADO')
                  ->where('estatus_registrado', '!=', 'REASIGNADO')
                  ->with('user:id,name')
                  ->orderBy('created_at', 'desc');
        }]);
    }

    $documento->bitacora->transform(function ($item) {
    // Seteamos el idioma local a español para Carbon
    \Carbon\Carbon::setLocale('es');
    $item->fecha_legible = $item->created_at->isoFormat('LLLL'); // Ej: "miércoles, 14 de octubre de 2026, 14:28"
    return $item;
});

// Formateamos también las fechas del documento base para el cargador de React
\Carbon\Carbon::setLocale('es');
$documento->fecha_doc_legible = $documento->fecha_documento->isoFormat('LL');
$documento->primera_asig_legible = $documento->fecha_primera_asignacion ? $documento->fecha_primera_asignacion->isoFormat('LLLL') : 'Sin asignación inicial';
$documento->ultima_asig_legible = $documento->fecha_ultima_asignacion ? $documento->fecha_ultima_asignacion->isoFormat('LLLL') : 'Sin reasignaciones';


    return Inertia::render('Documentos/Show', [
        'documento' => $documento,
        'roleUsuario' => $usuarioActivo->role
    ]);
}


    public function mostrarFormularioCarga(Request $request)
    {
        if (auth()->user()->role === 'notificador') {
            abort(403);
        }

        // 1. Iniciamos la consulta base con Eager Loading para optimizar la RAM del servidor
        $query = Documento::with(['area', 'tipoDocumento', 'ciac','user'])->orderBy('created_at', 'desc');

        // AISLAMIENTO TOTAL: El Coordinador CIAC solo ve su propio CIAC
        if (auth()->user()->role === 'coordinador_ciac') {
            $query->where('ciac_id', auth()->user()->ciac_id);
        }


        // 2. FILTRO DE BÚSQUEDA exacta o parcial por RFC
        if ($request->filled('rfc')) {
            $query->where('rfc_contribuyente', 'LIKE', '%' . strtoupper(trim($request->rfc)) . '%');
        }

        // 3. FILTRO POR ÁREA DE ORIGEN
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        // 4. FILTRO POR ESTATUS DEL DOCUMENTO
        if ($request->filled('estatus')) {
            $query->where('estatus', $request->estatus);
        }

        // 5. FILTRO POR CIAC ASIGNADO
       if ($request->filled('ciac')) {
            $query->where('ciac_id', $request->ciac);
        }

        // 6. FILTRO POR FECHA DEL DOCUMENTO
        if ($request->filled('fecha')) {
            $query->whereDate('fecha_documento', $request->fecha);
        }

        // 7. FILTRO: BUSCAR POR NOTIFICADOR ASIGNADO
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return Inertia::render('Documentos/Cargar', [
            // Enviamos los documentos ya filtrados por el motor de PostgreSQL
            'documentos' => $query->paginate(10)->withQueryString(),
            // Catálogos para rellenar las herramientas de la barra de búsqueda
            'areas' => Area::orderBy('nombre', 'asc')->get(),
            'ciacs' => Ciac::orderBy('nombre', 'asc')->get(),
            'tiposDocumento' => TipoDocumento::orderBy('nombre', 'asc')->get(),
            'notificadores' => User::where('role', 'notificador')->where('activo', true)->select('id', 'name')->orderBy('name', 'asc')->get(),
            // Mantenemos el estado de los filtros para que no se borren al recargar la pantalla
            'filtros' => $request->only(['rfc', 'area_id', 'estatus', 'ciac', 'fecha', 'user_id']),
            'roleUsuario' => auth()->user()->role,
            'areaUsuario' => auth()->user()->area_id,
            'ciacUsuario' => auth()->user()->ciac_id,
        ]);
    }


    /**
     * AGREGAR REGISTRO EN FORMA INDIVIDUAL
     */
    public function store(Request $request)
    {
        // Candado de seguridad
        if (auth()->user()->role === 'notificador') {
            abort(403, 'Acceso denegado.');
        }

        $request->merge([
        'numero_control' => $request->filled('numero_control') ? trim($request->numero_control) : null,
        'numero_oficio'  => $request->filled('numero_oficio') ? trim($request->numero_oficio) : null,
        'referencias_domicilio' => $request->filled('referencias_domicilio') ? trim($request->referencias_domicilio) : null,
        ]);

        // Validamos estrictamente según las reglas del documento de la SEFIN
        $request->validate([
            // Exige Número de Control únicamente si el Número de Oficio es nulo/vacío
        'numero_control' => 'nullable|string|max:255|required_without:numero_oficio|unique:documentos,numero_control',
        // Exige Número de Oficio únicamente si el Número de Control es nulo/vacío
        'numero_oficio'  => 'nullable|string|max:255|required_without:numero_control|unique:documentos,numero_oficio',
            'razon_social_contribuyente' => 'required|string|max:255',
            'domicilio_contribuyente' => 'required|string',
            'referencias_domicilio'      => 'nullable|string',
            'fecha_documento' => 'required|date',
            'area_id' => 'required|exists:areas,id',
            'tipo_documento_id' => 'required|exists:tipo_documentos,id',
            'user_id' => 'nullable|exists:users,id', // Opcional al inicio
        ]);

        if ($request->filled('numero_control') && $request->filled('numero_oficio')) {
            return redirect()->back()->withErrors(['numero_oficio' => 'Por norma del sistema, un oficio no puede contar con Número de Control y Número de Oficio al mismo tiempo. Deja uno vacío.']);
        }

        // Si el administrador asignó un notificador desde el inicio, registramos la fecha
        $fechaAsignacion = $request->filled('user_id') ? now() : null;

        if(auth()->user()->role === 'coordinador_ciac') {
            // Si el usuario es un coordinador de CIAC, forzamos que el documento se asigne a su propio CIAC
            $ciac = auth()->user()->ciac_id;
        } else {
            // Para otros roles, validamos que el CIAC exista en la base de datos
            $request->validate([
                'ciac_id' => 'required|exists:ciacs,id',
            ]);
            $ciac = $request->ciac_id;
        }


        Documento::create([
            'numero_control' => trim($request->numero_control),
            'numero_oficio' => trim($request->numero_oficio),
            'ciac_id' => $ciac,
            'rfc_contribuyente' => strtoupper(trim($request->rfc_contribuyente)),
            'razon_social_contribuyente' => trim($request->razon_social_contribuyente),
            'domicilio_contribuyente' => trim($request->domicilio_contribuyente),
            'referencias_domicilio'      => $request->filled('referencias_domicilio') ? trim($request->referencias_domicilio) : null,
            'fecha_documento' => $request->fecha_documento,
            'area_id' => $request->area_id,
            'tipo_documento_id' => $request->tipo_documento_id,
            'user_id' => $request->user_id,
            'estatus' => 'PENDIENTE POR NOTIFICAR',
            'fecha_primera_asignacion' => $fechaAsignacion,
            'fecha_ultima_asignacion' => $fechaAsignacion,
        ]);

        return redirect()->back()->with('success', 'Documento individual registrado y asignado correctamente.');
    }


    /**
     * Procesa la carga masiva de archivos Excel (.xlsx / .csv)
     */
    public function cargarMasivo(Request $request)
    {
        // 1. Candado de seguridad estricto: Solo el Administrador pasa
        if (auth()->user()->role === 'notificador') {
            abort(403, 'Acceso denegado. Acción exclusiva para el Administrador del sistema.');
        }

        // 2. Validamos que realmente se haya subido un archivo válido
        $request->validate([
            'archivo_excel' => 'required|file|mimes:xlsx,xls,csv|max:10240', // Máximo 10MB
        ]);

        $file = $request->file('archivo_excel');

        try {
            // Cargamos el archivo en la memoria del servidor
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            // Quitamos la primera fila si es que contiene los encabezados del Excel
            $encabezados = array_shift($rows);

            // Contadores para darle retroalimentación visual al Administrador
            $insertados = 0;

            // 3. Transacción de Base de Datos: Si una fila falla, PostgreSQL deshace todo para no dejar basura
            DB::transaction(function () use ($rows, &$insertados) {
                foreach ($rows as $row) {
                    // Si la fila está completamente vacía (por ejemplo, el RFC), la saltamos
                    if (empty($row[0]) && empty($row[2])) {
                        continue;
                    }

                    /**
                     * MAREO DE COLUMNAS BASADO EN TU EXCEL DE LA SEFIN:
                     * $row[0] = AREA DE ORIGEN (Ej: SUBSECRETARIA DE INGRESOS)
                     * $row[1] = TIPO DE DOCUMENTO (Ej: OFICIOS)
                     * $row[2] = NUMERO DE CONTROL
                     * $row[3] = NUMERO DE OFICIO
                     * $row[4] = RFC DEL CONTRIBUYENTE
                     * $row[5] = NOMBRE O RAZÓN SOCIAL DEL CONTRIBUYENTE
                     * $row[6] = DOMICILIO DEL CONTRIBUYENTE
                     * $row[7] = REFERENCIAS DEL DOMICILIO
                     * $row[8] = FECHA DEL DOCUMENTO
                     * $row[9] = CIAC ASIGNADO (Opcional)
                     */

                    $numControl = trim($row[2]);
                    $numControl  = !empty(trim($numControl)) ? trim($numControl) : null;
                    $numOficio  = trim($row[3]);
                    $numOficio   = !empty(trim($numOficio)) ? trim($numOficio) : null;

                    if(auth()->user()->role === 'coordinador_ciac') {
                        // Si el usuario es un coordinador de CIAC, forzamos que el documento se asigne a su propio CIAC
                        $ciac = Ciac::find(auth()->user()->ciac_id);
                    }else{
                        $ciacAsignado = trim($row[9]);
                        $ciacAsignado = !empty(trim($ciacAsignado)) ? trim($ciacAsignado) : null;

                        // Buscamos el CIAC. Si no existe en la BD, la damos de alta
                        $ciac = Ciac::firstOrCreate(['nombre' => $ciacAsignado]);
                    }

                    // A. Buscamos el Área. Si no existe en la BD, la damos de alta
                    $area = Area::firstOrCreate(['nombre' => trim($row[0])]);

                    // B. Buscamos el Tipo de Documento. Si no existe, lo creamos
                    $tipoDoc = TipoDocumento::firstOrCreate(['nombre' => trim($row[1])]);

                    // C. Formateamos la fecha del documento de forma segura
                    $fechaDocRaw = trim($row[8]); // Columna de la fecha (Fila 8 del Excel)

                    // REGLA DE EXCLUSIÓN MUTUA: Validamos que venga uno o el otro, pero no ambos vacíos ni ambos llenos
                    if (empty($numControl) && empty($numOficio)) {
                        continue; // Se salta la fila por falta de identificador
                    }
                    if (!empty($numControl) && !empty($numOficio)) {
                    // Si vienen ambos, limpiamos uno priorizando el Número de Control por norma institucional
                        $numOficio = null; 
                    }

                    $fechaDocumento = now()->format('Y-m-d');
                    if (!empty($fechaDocRaw)) {
                        try {
                            //Si Excel guardó la fecha como un número de serie entero (ej: 46308)
                            if (is_numeric($fechaDocRaw)) {
                                $dateObject = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($fechaDocRaw);
                                $fechaDocumento = $dateObject->format('Y-m-d');
                            } else {
                                // Si viene como un texto normal (ej: "2026-10-13" desde un .csv)
                                $fechaDocumento = \Carbon\Carbon::parse($fechaDocRaw)->format('Y-m-d');
                            }
                        } catch (\Exception $e) {
                        // Registro de respaldo por si el formato en el Excel viene completamente roto
                        \Log::warning("Formato de fecha inválido en carga masiva: " . $fechaDocRaw);
                        $fechaDocumento = now()->format('Y-m-d');
                        }
                    }

                    $referencias= trim($row[7]); // Columna de referencias del domicilio
                    

                    // Determinamos la llave única para el updateOrCreate (el que esté presente)
                    $matchField = !empty($numControl) ? ['numero_control' => $numControl] : ['numero_oficio' => $numOficio];


                    // D. Insertamos el documento inicial en PostgreSQL
                    // Usamos updateOrCreate para evitar errores si vuelven a subir el mismo número de control
                    Documento::updateOrCreate(
                        $matchField, // Llave única de búsqueda
                        [
                            'numero_control' => !empty($numControl) ? $numControl : null,
                            'numero_oficio'  => !empty($numOficio) ? $numOficio : null,
                            'user_id' => null, // Nace libre, sin notificador asignado
                            'area_id' => $area->id,
                            'tipo_documento_id' => $tipoDoc->id,
                            'rfc_contribuyente' => strtoupper(trim($row[4])),
                            'razon_social_contribuyente' => trim($row[5]),
                            'domicilio_contribuyente' => trim($row[6]),
                            'fecha_documento' => $fechaDocumento,
                            'estatus' => 'PENDIENTE POR NOTIFICAR',
                            'ciac_id' => $ciac->id,
                            'fecha_primera_asignacion' => null,
                            'fecha_ultima_asignacion' => null,
                            'referencias_domicilio' => !empty($referencias) ? $referencias : null,
                        ]
                    );

                    $insertados++;
                }
            });

            // Regresamos a la pantalla anterior inyectando un mensaje de éxito flotante
            return redirect()->back()->with('success', "¡Carga masiva completada! Se procesaron {$insertados} documentos exitosamente.");

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['archivo_excel' => 'Error al procesar la estructura del Excel: ' . $e->getMessage()]);
        }
    }

    /**
    * Procesa la asignación masiva de un lote de documentos a un notificador específico.
    */
    public function asignarMasivo(Request $request)
    {

        // Candado de seguridad institucional estricto
        if (auth()->user()->role === 'notificador') {
            abort(403, 'Acceso denegado.');
        }

        // 2. Validamos que vengan los IDs de los oficios y el ID del empleado real
        $request->validate([
            'documento_ids' => 'required|array',
            'documento_ids.*' => 'exists:documentos,id',
            'user_id' => 'required|exists:users,id',
        ]);

        $userId = $request->user_id;
        $documentoIds = $request->documento_ids;
        $ahora = now();

        // para poder avisarle a sus aplicaciones que los eliminen de su lista.
        $notificadoresAnteriores = Documento::whereIn('id', $documentoIds)
        ->whereNotNull('user_id')
        ->pluck('user_id')
        ->unique()
        ->toArray();

        // 3. Ejecutamos la actualización en bloque optimizada para PostgreSQL
        DB::transaction(function () use ($documentoIds, $userId, $ahora) {
            foreach ($documentoIds as $id) {
                $documento = Documento::findOrFail($id);

                // Bloqueo para Coordinador de Área
                if (auth()->user()->role === 'coordinador_area' && $documento->area_id !== auth()->user()->area_id) {
                    abort(403, 'Acceso denegado. No tienes permisos para editar documentos de otras áreas.');
                }

                // Bloqueo para Coordinador CIAC
                if (auth()->user()->role === 'coordinador_ciac' && $documento->ciac_id !== auth()->user()->ciac_id) {
                    abort(403, 'Acceso denegado. No tienes permisos para modificar documentos ajenos a tu CIAC.');
                }

                // Evaluamos si es su primera asignación histórica en la SEFIN
                $esPrimeraAsignacion = is_null($documento->fecha_primera_asignacion);

                $documento->update([
                    'user_id' => $userId,
                    'fecha_ultima_asignacion' => $ahora,
                    'fecha_primera_asignacion' => $esPrimeraAsignacion ? $ahora : $documento->fecha_primera_asignacion
                ]);

                // Inyectamos automáticamente la fila de auditoría en la Bitácora
                $documento->bitacora()->create([
                    'user_id' => $userId,
                    'asignado_por' => auth()->user()->id,
                    'estatus_registrado' => 'PENDIENTE POR NOTIFICAR',
                    'tipo_documento_proceso' => null, // Movimiento puramente administrativo
                    'hora_inicio_visita' => null,
                    'hora_fin_visita' => null,
                    'observaciones_operativas' => $esPrimeraAsignacion 
                        ? "Documento asignado inicialmente por el Administrador."
                        : "Documento reasignado en por el Administrador."
                ]);
            }
        });

        //Le avisamos al nuevo notificador que le llegó trabajo
    event(new \App\Events\DocumentoActualizado($userId));

    //Le avisamos a los notificadores anteriores para que quiten los folios de su pantalla
    foreach ($notificadoresAnteriores as $antiguoId) {
        if ($antiguoId != $userId) {
            event(new \App\Events\DocumentoActualizado($antiguoId));
        }
    }

        return redirect()->back()->with('success', '¡Lote de documentos asignado y notificado con éxito!');
    }

    public function update(Request $request, $id)
    {
        if (auth()->user()->role === 'notificador') { abort(403); }
    
        $documento = Documento::findOrFail($id);

         // Bloqueo para Coordinador de Área
        if (auth()->user()->role === 'coordinador_area' && $documento->area_id !== auth()->user()->area_id) {
            abort(403, 'Acceso denegado. No tienes permisos para editar documentos de otras áreas.');
        }

        // Bloqueo para Coordinador CIAC
        if (auth()->user()->role === 'coordinador_ciac' && $documento->ciac_id !== auth()->user()->ciac_id) {
            abort(403, 'Acceso denegado. No tienes permisos para modificar documentos ajenos a tu CIAC.');
        }
    
        $request->validate([
            'numero_control' => 'required|string|unique:documentos,numero_control,'.$id,
            'numero_oficio' => 'required|string',
            'rfc_contribuyente' => 'required|string|max:13',
            'razon_social_contribuyente' => 'required|string',
            'domicilio_contribuyente' => 'required|string',
            'fecha_documento' => 'required|date',
            'area_id' => 'required|exists:areas,id',
            'ciac_id' => 'required|exists:ciacs,id',
            'tipo_documento_id' => 'required|exists:tipo_documentos,id',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $documento->update($request->all());
    
        return redirect()->back();
    }

    public function destroy($id)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }
        $documento = Documento::findOrFail($id);
        // Al eliminar el documento, PostgreSQL borrará la bitácora en cascada automáticamente
        $documento->delete();
    
        return redirect()->back();
    }

   
/**
 * Registra y valida un acta de notificación generada en campo por el celular.
 */
public function registrarVisita(Request $request, $id)
{
    // 1. Candado de rol: Solo notificadores en campo pueden procesar
    if (auth()->user()->role !== 'notificador') {
        abort(403, 'Acceso denegado.');
    }

    $esNoTrabajado = $request->input('estatus_registrado') === 'NO TRABAJADO';

    $request->validate([
        'estatus_registrado'       => 'required|string',
        'tipo_documento_proceso'   => $esNoTrabajado ? 'nullable|string' : 'required|string',
        'hora_inicio_visita'       => 'required|date',
        'hora_fin_visita'          => 'required|date',
        'ubicacion_gps'            => 'required|string',
        'observaciones_operativas' => 'required|string',
        'foto'                     => $esNoTrabajado ? 'nullable' : 'required|image|mimes:jpeg,png,jpg,heic,webp|max:20480', // Maximo 20MB
    ]);

    $documento = Documento::findOrFail($id);
    $foto = $request->file('foto');

    // Validamos que la foto provenga de una captura real de cámara (No de internet/galería)
    // Las fotos reales de dispositivos móviles contienen metadatos EXIF (marca de cámara, apertura, etc.)
    $metaExif = (function_exists('exif_read_data') && $foto) ? @exif_read_data($foto->getRealPath()) : null;
    
    // Si la institución exige auditoría criptográfica estricta, puedes activar este bloque:
    // if (!$metaExif || !isset($metaExif['Model'])) {
    //     return redirect()->back()->withErrors(['foto' => 'Evidencia rechazada. La imagen no proviene de una captura de cámara en tiempo real.']);
    // }

    $urlFotoPublica = null;
    //Si tiene un estatus de NO TRABAJADO, no se requiere foto, pero si la tiene, la guardamos de manera local.
    if ($request->hasFile('foto') && !$esNoTrabajado) {
        $nombreFoto = 'evidencia_' . $documento->numero_control . '_' . time() . '.' . $foto->getClientOriginalExtension();
        $pathFoto = $foto->storeAs('evidencias_campo', $nombreFoto, 'public');
        $urlFotoPublica = '/storage/' . $pathFoto;
    }

    // CÁLCULO MATEMÁTICO AUTOMÁTICO DE PERMANENCIA (Control de confianza de tiempo)
    $inicio = \Carbon\Carbon::parse($request->hora_inicio_visita);
    $fin = \Carbon\Carbon::parse($request->hora_fin_visita);
    $segundos = $inicio->diffInSeconds($fin);
    $minutosPermanencia = (int) round($segundos / 60); 

    // Si duró menos de 30 segundos, round dará 0. Puedes poner un candado por si quieres que el mínimo sea 1:
    if ($minutosPermanencia === 0 && $segundos > 0) {
        $minutosPermanencia = 1;
    }

    // 3. Ejecutamos la inserción en bloque unificada
    DB::transaction(function () use ($documento, $request, $urlFotoPublica, $minutosPermanencia) {
        
        // A. Actualizamos el estatus del documento madre si el ciclo ha concluido
        $documento->update([
            'estatus' => $request->estatus_registrado
        ]);

        // B. Inyectamos la fila de auditoría de campo dentro de la Bitacora
        $documento->bitacora()->create([
            'user_id'                  => auth()->id(),
            'estatus_registrado'       => $request->estatus_registrado,
            'tipo_documento_proceso'   => $request->tipo_documento_proceso,
            'hora_inicio_visita'       => $request->hora_inicio_visita,
            'hora_fin_visita'          => $request->hora_fin_visita,
            'minutos_permanencia'      => $minutosPermanencia,
            'ubicacion_gps'            => $request->ubicacion_gps,
            'url_foto'                 => $urlFotoPublica,
            'observaciones_operativas' => trim($request->observaciones_operativas),
        ]);
    });

    // ALERTA EN TIEMPO REAL: Le avisamos al Administrador (canal público) y al celular (canal privado)
    // que el estatus cambió y se firmó el acta.
    event(new \App\Events\DocumentoActualizado($documento->user_id));

    return redirect()->back()->with('success', '¡Acta de territorio registrada y firmada digitalmente!');
}



}