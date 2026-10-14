<?php

namespace App\Http\Controllers;

use App\Models\Documento;
use App\Models\Area;
use App\Models\TipoDocumento;
use App\Models\User;
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

    public function mostrarFormularioCarga(Request $request)
    {
        if (auth()->user()->role !== 'administrador') {
            abort(403);
        }

        // 1. Iniciamos la consulta base con Eager Loading para optimizar la RAM del servidor
        $query = Documento::with(['area', 'tipoDocumento', 'user'])->orderBy('created_at', 'desc');

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
            $query->where('ciac_asignado', 'LIKE', '%' . trim($request->ciac) . '%');
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
            'tiposDocumento' => TipoDocumento::orderBy('nombre', 'asc')->get(),
            'notificadores' => User::where('role', 'notificador')->where('activo', true)->select('id', 'name')->orderBy('name', 'asc')->get(),
            // Mantenemos el estado de los filtros para que no se borren al recargar la pantalla
            'filtros' => $request->only(['rfc', 'area_id', 'estatus', 'ciac', 'fecha', 'user_id']),
        ]);
    }


    /**
     * AGREGAR REGISTRO EN FORMA INDIVIDUAL
     */
    public function store(Request $request)
    {
        // Candado de seguridad
        if (auth()->user()->role !== 'administrador') {
            abort(403, 'Acceso denegado.');
        }

        // Validamos estrictamente según las reglas del documento de la SEFIN
        $request->validate([
            'numero_control' => 'required|string|unique:documentos,numero_control',
            'numero_oficio' => 'required|string',
            'rfc_contribuyente' => 'required|string|max:13',
            'razon_social_contribuyente' => 'required|string|max:255',
            'domicilio_contribuyente' => 'required|string',
            'fecha_documento' => 'required|date',
            'area_id' => 'required|exists:areas,id',
            'tipo_documento_id' => 'required|exists:tipo_documentos,id',
            'user_id' => 'nullable|exists:users,id', // Opcional al inicio
        ]);

        // Si el administrador asignó un notificador desde el inicio, registramos la fecha
        $fechaAsignacion = $request->filled('user_id') ? now() : null;

        Documento::create([
            'numero_control' => trim($request->numero_control),
            'numero_oficio' => trim($request->numero_oficio),
            'rfc_contribuyente' => strtoupper(trim($request->rfc_contribuyente)),
            'razon_social_contribuyente' => trim($request->razon_social_contribuyente),
            'domicilio_contribuyente' => trim($request->domicilio_contribuyente),
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
        if (auth()->user()->role !== 'administrador') {
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
                     * $row[7] = FECHA DEL DOCUMENTO
                     */

                    // A. Buscamos el Área. Si no existe en la BD, la damos de alta al vuelo
                    $area = Area::firstOrCreate(['nombre' => trim($row[0])]);

                    // B. Buscamos el Tipo de Documento. Si no existe, lo creamos
                    $tipoDoc = TipoDocumento::firstOrCreate(['nombre' => trim($row[1])]);

                    // C. Formateamos la fecha del documento de forma segura
                    $fechaDocRaw = trim($row[7]); // Columna de la fecha (Fila 8 del Excel)
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

                    // D. Insertamos el documento inicial en PostgreSQL
                    // Usamos updateOrCreate para evitar errores si vuelven a subir el mismo número de control
                    Documento::updateOrCreate(
                        ['numero_control' => trim($row[2])], // Llave única de búsqueda
                        [
                            'user_id' => null, // Nace libre, sin notificador asignado
                            'area_id' => $area->id,
                            'tipo_documento_id' => $tipoDoc->id,
                            'numero_oficio' => trim($row[3]),
                            'rfc_contribuyente' => strtoupper(trim($row[4])),
                            'razon_social_contribuyente' => trim($row[5]),
                            'domicilio_contribuyente' => trim($row[6]),
                            'fecha_documento' => $fechaDocumento,
                            'estatus' => 'PENDIENTE POR NOTIFICAR',
                            'ciac_asignado' => null,
                            'fecha_primera_asignacion' => null,
                            'fecha_ultima_asignacion' => null
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
        // 1. Candado de seguridad institucional estricto
        if (auth()->user()->role !== 'administrador') {
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

        // 3. Ejecutamos la actualización en bloque optimizada para PostgreSQL
        DB::transaction(function () use ($documentoIds, $userId, $ahora) {
            foreach ($documentoIds as $id) {
                $documento = Documento::findOrFail($id);

                // Evaluamos si es su primera asignación histórica en la SEFIN
                $esPrimeraAsignacion = is_null($documento->fecha_primera_asignacion);

                $documento->update([
                    'user_id' => $userId,
                    'fecha_ultima_asignacion' => $ahora,
                    'fecha_primera_asignacion' => $esPrimeraAsignacion ? $ahora : $documento->fecha_primera_asignacion
                ]);

                // 📋 Inyectamos automáticamente la fila de auditoría en la Bitácora
                $documento->bitacora()->create([
                    'user_id' => $userId,
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

        return redirect()->back()->with('success', '¡Lote de documentos asignado y notificado con éxito!');
    }

    public function update(Request $request, $id)
    {
        if (auth()->user()->role !== 'administrador') { abort(403); }
    
        $documento = Documento::findOrFail($id);
    
        $request->validate([
            'numero_control' => 'required|string|unique:documentos,numero_control,'.$id,
            'numero_oficio' => 'required|string',
            'rfc_contribuyente' => 'required|string|max:13',
            'razon_social_contribuyente' => 'required|string',
            'domicilio_contribuyente' => 'required|string',
            'fecha_documento' => 'required|date',
            'area_id' => 'required|exists:areas,id',
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


}