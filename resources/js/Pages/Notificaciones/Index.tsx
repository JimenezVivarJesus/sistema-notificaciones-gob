import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface Notificacion {
    id: number;
    usuario: string;
    codigo_barras: string;
    estado: string;
    proxima_visita: string | null; // Fecha en formato YYYY-MM-DD
    motivo_acta: string;
    numero_visitas: number;
    url_foto: string;
    ubicacion_gps: string | null;
    foto: File | null;
    created_at: string;
}

interface Empleado {
    id: number;
    name: string;
}

interface Props {
    notificaciones: Notificacion[];
    empleados: Empleado[];      
    filtros: {                       // <-- REEMPLAZA filtroActual POR EL OBJETO filtros
        empleado_id: string;
        fecha_inicio: string;
        fecha_fin: string;
    };     
}

export default function Index({ notificaciones, empleados, filtros }: Props) {
     // El hook usePage de Inertia te da acceso a las variables globales compartidas por el backend
    const { auth } = usePage().props as any;
    const usuarioLogueado = auth.user; // Contiene: id, name, email, role


    // Función que se detona al cambiar de empleado en el select
    const handleFiltroEmpleado = (id: string) => {
        router.get('/notificaciones', { empleado_id: id }, {
            preserveState: true, // Evita que el formulario de creación pierda lo que el usuario estaba escribiendo
            replace: true        // No satura el historial de navegación "Atrás" del navegador
        });
    };

    // Inicializamos estados locales en React para las fechas independientes
    const [fechaInicio, setFechaInicio] = useState(filtros.fecha_inicio);
    const [fechaFin, setFechaFin] = useState(filtros.fecha_fin);

    // Función unificada que recolecta todos los filtros y recarga la página por GET
    const aplicarFiltros = (cambios: Record<string, string>) => {
        // Combinamos el estado actual con el nuevo cambio (empleado o fechas)
        const params = {
            empleado_id: cambios.empleado_id !== undefined ? cambios.empleado_id : filtros.empleado_id,
            fecha_inicio: cambios.fecha_inicio !== undefined ? cambios.fecha_inicio : fechaInicio,
            fecha_fin: cambios.fecha_fin !== undefined ? cambios.fecha_fin : fechaFin,
        };

        router.get('/notificaciones', params, {
            preserveState: true,
            replace: true
        });
    };

    const limpiarFiltros = () => {
        setFechaInicio('');
        setFechaFin('');
        router.get('/notificaciones', {}, { replace: true });
    };


    // El hook useForm de Inertia maneja estados, errores y envíos automáticamente
    const { data, setData, post, put, delete: destroy, errors, reset, transform, progress } = useForm({
        usuario: usuarioLogueado.name,
        user_id: usuarioLogueado.id,
        codigo_barras: ' ',
        estado: 'notificado',
        proxima_visita: '', // Fecha actual en formato YYYY-MM-DD
        motivo_acta: '',
        numero_visitas: 1,
        url_foto: '_',
        ubicacion_gps: null as string | null,
        foto: null as File | null,
    });

   


    const [editId, setEditId] = useState<number | null>(null);

    const [isScanning, setIsScanning] = useState(false);


    // 3. Efecto para controlar el encendido/apagado de la cámara
    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        if (isScanning) {
            // Inicializa el lector dentro del contenedor HTML con id "reader"
            scanner = new Html5QrcodeScanner("reader", { 
                fps: 10, 
                qrbox: { width: 250, height: 150 } // Caja visual adaptada a códigos de barras alargados
            }, false);

            scanner.render(
                (decodedText) => {
                    // Éxito: Guardamos el texto escaneado en el formulario
                    setData('codigo_barras', decodedText);
                    setIsScanning(false); // Apagamos la cámara
                    scanner?.clear();     // Limpiamos el lector
                },
                (error) => {
                    // Ignoramos los errores continuos de escaneo mientras busca el código
                }
            );
        }

        // Limpieza al desmontar el componente o apagar la cámara
        return () => {
            if (scanner) {
                scanner.clear().catch(err => console.error("Error al limpiar scanner", err));
            }
        };
    }, [isScanning]);

    // Función para dar un formato institucional y limpio a la fecha de PostgreSQL
    const formatearFechaRegistro = (fechaIso: string) => {
        if (!fechaIso) return 'Sin fecha';
        const fecha = new Date(fechaIso);
    
        return new Intl.DateTimeFormat('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(fecha);
    };

    //Función para obtener la ubicación mediante el navegador
    const obtenerUbicacion = (): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn("Geolocalización no soportada por el navegador.");
            return resolve(null);
        }

        // Solicitamos la ubicación con un tiempo de espera máximo de 5 segundos para no trabar el formulario
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coordenadaUnificada = `${position.coords.latitude},${position.coords.longitude}`;
                resolve(coordenadaUnificada);
                console.log("Ubicación obtenida:", coordenadaUnificada);
            },
            (error) => {
                console.warn("El usuario denegó el permiso o el GPS falló.");
                resolve(null); // Si falla, resolvemos null para que el formulario se envíe de todos modos
            },
            { timeout: 5000 }
        );
    });
    };

    // Función para convertir el enlace de Google Drive en una imagen directa
const obtenerUrlImagenDirecta = (urlOriginal: string) => {
    if (!urlOriginal) return '';
    
    // Si ya viene con el formato de descarga "uc?export=view&id=", la dejamos pasar
    if (urlOriginal.includes('uc?export=view')) return urlOriginal;

    // Buscamos el ID largo del archivo en la URL de Google Drive
    const matches = urlOriginal.match(/\/file\/d\/(.+?)\//) || urlOriginal.match(/id=(.+?)(&|\$)/);
    const fileId = matches ? matches[1] : null;

    // Si encontramos el ID, devolvemos el endpoint de renderizado directo de Google
    return fileId ? `https://google.com{fileId}` : urlOriginal;
};


    // Enviar formulario (Crear o Editar)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Detenemos el flujo y esperamos a que el navegador obtenga el GPS
        const coordenadas = await obtenerUbicacion();

        /*if (editId) {
            
            put(`/notificaciones/${editId}`, {
                onSuccess: () => { setEditId(null); reset(); }
            });
        } else {
           
            post('/notificaciones', {
                 data: {
                ...data,
                    ubicacion_gps: coordenadas // Se inyecta automáticamente aquí
                },
                onSuccess: () => reset()
            });
        }*/
       // 2. Modificamos la variable 'ubicacion_gps' dentro del estado del formulario de Inertia
     // 2. Usamos 'transform' para inyectar la ubicación al vuelo antes de disparar el POST
    transform((dataActual: Record<string, any>) => ({
        ...dataActual,
        user_id: usuarioLogueado.id, // Aseguramos que el user_id se envíe correctamente
        ubicacion_gps: coordenadas, // Aquí unimos la latitud,longitud de forma segura
    }));

    // 3. Disparamos el POST pasando únicamente la URL (1 solo argumento, justo lo que espera TypeScript)
    post('/notificaciones', {
        onSuccess: () => reset()
    });
      
    };

    // Preparar campos para editar
    const handleEdit = (notificacion: Notificacion) => {
        setEditId(notificacion.id);
        setData({
            usuario: notificacion.usuario,
            codigo_barras: notificacion.codigo_barras,
            estado: notificacion.estado,
            proxima_visita: notificacion.proxima_visita || '', // Fecha actual en formato YYYY-MM-DD
            motivo_acta: notificacion.motivo_acta || ' ',
            numero_visitas: notificacion.numero_visitas || 1,
            url_foto: notificacion.url_foto || ' ',
            ubicacion_gps: notificacion.ubicacion_gps || null
        });
    };

    // Eliminar registro
    const handleDelete = (id: number) => {
        if (confirm('¿Seguro que deseas eliminar esta notificación oficial?')) {
            destroy(`/notificaciones/${id}`);
        }
    };

    return (
         <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-institucional dark:text-gray-200">
                    Gestión Oficial de Notificaciones
                </h2>
            }
        >

        {/* Agregamos el título en la pestaña del navegador */}
        <Head title="Notificaciones" />
        
        <div className="py-12 mx-auto max-w-7xl lg:px-8">
       

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            
                {/* FORMULARIO */}
                {usuarioLogueado.role === 'notificador' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow h-fit">
                    <h2 className="text-xl font-semibold mb-4">{editId ? '📝 Editar Notificación' : '➕ Nueva Notificación'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4 text-gray-700 dark:text-gray-200">
                        <div>
                            <label className="block text-sm font-medium">Nombre del notificador</label>
                            <input type="text" value={data.usuario} onChange={e => setData('usuario', e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            {errors.usuario && <span className="text-red-500 text-xs">{errors.usuario}</span>}
                        </div>


                        <div>
                <label className="block text-sm font-medium">📦 Código de Barras</label>
                <div className="flex gap-2 mt-1">
                    <input 
                        type="text" 
                        placeholder="Escribe o escanea un código"
                        value={data.codigo_barras || ""} 
                        onChange={e => setData('codigo_barras', e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-gray-700 text-gray-900 dark:text-white" 
                    />
                    
                    <button
                    type="button"
                    onClick={() => setIsScanning(!isScanning)}// O el nombre de tu función para activar la cámara
                    className="w-full relative group overflow-hidden bg-gradient-to-r from-[#9D2449] to-[#7a1b38] hover:from-[#7a1b38] hover:to-[#5c1328] text-white p-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-3 border border-[#9D2449]/20"
                    >
                    {/* ⚡ EFECTO VISUAL: Destello de luz que cruza el botón al pasar el cursor (Hover) */}
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] z-0" />

                    {/* 🔍 ICONO VECTORIAL (SVG): Un escáner con su línea láser roja integrada */}
                        <div className="relative z-10 bg-white/10 p-1.5 rounded-lg border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-200">
                            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org/2000/svg">
                            {/* Esquinas del visor del escáner */}
                            <path d="M4 8V5C4 4.44772 4.44772 4 5 4H8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M20 8V5C20 4.44772 19.5523 4 19 4H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M4 16V19CC4 19.5523 4.44772 20 5 20H8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M20 16V19CC20 19.5523 19.5523 20 19 20H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            {/* Líneas del código de barras */}
                            <path d="M8 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M16 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            {/* 🔴 LÁSER ROJO: Micro-animación intermitente */}
                            <path d="M2 12H22" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
                            </svg>
                        </div>

                        {/* TEXTO DEL BOTÓN EN PRIMER PLANO */}
                        <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                            Escanear Código
                        </span>
                    </button>

                </div>
                {errors.codigo_barras && <span className="text-red-500 text-xs">{errors.codigo_barras}</span>}
            </div>

            {/* CONTENEDOR DE LA CÁMARA: Solo aparece si está activo el escaneo */}
            {isScanning && (
                <div className="border-2 border-dashed border-purple-500 rounded p-4 bg-gray-50 dark:bg-gray-900">
                    <div id="reader" className="w-full"></div>
                    <p className="text-xs text-center text-gray-500 mt-2">Coloca el código de barras frente a la cámara dentro del recuadro.</p>
                </div>
            )}

                        <div>
                            <label className="block text-sm font-medium">Estado</label>
                            <select value={data.estado} onChange={e => setData('estado', e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                <option value="notificado">Notificado</option>
                                <option value="citatorio">Citatorio</option>
                                <option value="acta">Acta de hechos</option>
                            </select>
                        </div>

                        {/* INPUT CONDICIONAL: Solo aparece si data.estado === 'citatorio' */}
                            {data.estado === 'citatorio' && (
                                <div className="transition-all duration-300 ease-in-out">
                                    <label className="block text-sm font-medium">
                                        Fecha de Próxima Visita
                                    </label>
                                    <input 
                                        type="date"
                                        value={data.proxima_visita || ""} 
                                        onChange={e => setData('proxima_visita', e.target.value)}
                                        className="w-full mt-1 p-2 border rounded dark:bg-gray-700" 
                                    />
                                    {errors.proxima_visita && (
                                    <span className="text-red-500 text-xs">{errors.proxima_visita}</span>
                                    )}
                                </div>
                        )}

                        {/* INPUT CONDICIONAL: Solo aparece si data.estado === 'acta' */}
                            {data.estado === 'acta' && (
                            <div>
                                <div className="transition-all duration-300 ease-in-out">
                                    <label className="block text-sm font-medium mt-2">
                                        Motivo del Acta de Hechos
                                    </label>
                                    <input 
                                        type="text"
                                        value={data.motivo_acta} 
                                        onChange={e => setData('motivo_acta', e.target.value)} 
                                        className="w-full mt-1 p-2 border rounded dark:bg-gray-700" 
                                    />
                                    {errors.motivo_acta && (
                                    <span className="text-red-500 text-xs">{errors.motivo_acta}</span>
                                    )}
                                </div>

                                <div className="transition-all duration-300 ease-in-out">
                                    <label className="block text-sm font-medium mt-2">
                                        Numero de visitas al domicilio
                                    </label>
                                    <input 
                                        type="number"
                                         min="1"
                                         max="3"
                                        value={data.numero_visitas} 
                                        onChange={e => setData('numero_visitas', parseInt(e.target.value) || 1)} 
                                        className="w-full mt-1 p-2 border rounded dark:bg-gray-700" 
                                    />
                                    {errors.numero_visitas && (
                                    <span className="text-red-500 text-xs">{errors.numero_visitas}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mt-2">
                                        Foto de evidencia:
                                    </label>
                                    <input 
                                        type="file" 
                                        accept="image/*" // Restringe a solo imágenes
                                        onChange={e => setData('foto', e.target.files ? e.target.files[0] : null)} // Captura el archivo binario
                                        className="w-full mt-1 p-1.5 border rounded dark:bg-gray-700 text-sm text-gray-500"
                                    />
                                    {errors.foto && <span className="text-red-500 text-xs">{errors.foto}</span>}
                                </div>


                            </div>
                        )}

                        {/* BARRA DE PROGRESO DE SUBIDA INTELIGENTE */}
                        {progress && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 mt-2 overflow-hidden shadow-inner relative flex items-center justify-center">
                            {/* Barra interna animada: aseguramos que el porcentaje sea número con (progress.percentage ?? 0) */}
                                <div 
                                    className={`h-full transition-all duration-300 ease-out absolute left-0 ${
                                    (progress.percentage ?? 0) >= 100 
                                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 animate-pulse'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                    }`}
                                    style={{ width: `${progress.percentage ?? 0}%` }} // <-- AGREGADO ?? 0 AQUÍ
                                />  
        
                            {/* TEXTO DINÁMICO QUE REACCIONA AL ESTADO REAL */}
                            <span className="relative text-xs font-bold text-gray-800 dark:text-white z-10 drop-shadow-sm flex items-center gap-1.5">
                                    {(progress.percentage ?? 0) < 100 ? (
                                        <>⚡ Transmitiendo archivo: {progress.percentage ?? 0}%</> // <-- AGREGADO ?? 0 AQUÍ
                                        ) : (
                                        <>☁️ Conectando con Google Drive...</>
                                    )}
                            </span>
                        </div>
                        )}



                       


                        <button
    type="submit"
    // Deshabilitamos el botón durante la carga de red para proteger PostgreSQL
    disabled={progress !== null}
    className={`w-full relative group overflow-hidden p-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-all duration-300 transform border border-black/10 flex items-center justify-center gap-3 ${
        progress 
            ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed shadow-none' 
            : 'bg-gradient-to-r from-[#9D2449] to-[#801a37] text-white hover:from-[#801a37] hover:to-[#631127] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
    }`}
>
    {/* ⚡ EFECTO VISUAL: Destello de luz que cruza el botón al pasar el cursor (Solo si no está cargando) */}
    {!progress && (
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] z-0" />
    )}

    {/* RETROALIMENTACIÓN INTERACTIVA DINÁMICA */}
    {progress ? (
        // ⏳ Icono de carga animado (Spinner) cuando transmite a Google Drive
        <div className="relative z-10 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://w3.org">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-mono">Subiendo Evidencia...</span>
        </div>
    ) : (
        // 💾 Icono vectorial de disquete / guardar oficial cuando el formulario está listo
        <>
            <div className="relative z-10 bg-white/10 p-1 rounded-md border border-white/10 group-hover:scale-110 transition-transform duration-200">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                    <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                Guardar Notificación
            </span>
        </>
    )}
</button>



                        {editId && (
                            <button type="button" onClick={() => { setEditId(null); reset(); }} className="w-full bg-gray-400 text-white p-2 rounded mt-2">
                                Cancelar
                            </button>
                        )}
                    </form>
                </div>
                 )}

                {/* TABLA DE RESULTADOS */}
                <div className={`${usuarioLogueado.role === 'administrador' 
                            ? 'md:col-span-4' 
                            : 'md:col-span-2'}
                            bg-white dark:bg-gray-800 p-6 rounded-lg shadow 
                `}>
                <h2 className="text-xl font-semibold mb-4">Registro Histórico</h2>



                    {/* BARRA DE HERRAMIENTAS DE FILTRADO INTERACTIVA (Exclusiva para Administrador) */}
                    {usuarioLogueado.role === 'administrador' && (
                    <div className="flex flex-wrap items-end gap-3 text-xs bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/60">
                
                        {/* FILTRO 1: EMPLEADO */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[180px]">
                            <label className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Notificador</label>
                                <select
                                value={filtros.empleado_id}
                                onChange={(e) => aplicarFiltros({ empleado_id: e.target.value })}
                                className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm w-full focus:ring-[#9D2449] focus:border-[#9D2449]"
                                >
                                    <option value="">Todos</option>
                                    {empleados.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                        </div>

                        {/* FILTRO 2: FECHA INICIO */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Desde</label>
                                <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => {
                                    setFechaInicio(e.target.value);
                                    if (fechaFin) aplicarFiltros({ fecha_inicio: e.target.value });
                                }}
                                className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-[#9D2449] focus:border-[#9D2449]"
                                />
                        </div>

                        {/* FILTRO 3: FECHA FIN */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Hasta</label>
                                <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => {
                                setFechaFin(e.target.value);
                                if (fechaInicio) aplicarFiltros({ fecha_fin: e.target.value });
                                }}
                                className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-[#9D2449] focus:border-[#9D2449]"
                                />
                        </div>

                        {/* BOTÓN REINICIAR (Solo si hay filtros activos) */}
                        {(filtros.empleado_id || filtros.fecha_inicio || filtros.fecha_fin) && (
                            <button
                            onClick={limpiarFiltros}
                            className="p-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40 rounded-lg transition-colors h-[38px] w-full sm:w-auto px-4"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                    )}

                    {notificaciones.length === 0 ? (
                        <p className="text-gray-500">No hay notificaciones emitidas actualmente.</p>
                    ) : (
                        <div className="space-y-4">
                            {notificaciones.map(n => {
                                const partes = n.ubicacion_gps ? n.ubicacion_gps.split(',') : null;
                                const latitud = partes && partes[0] ? parseFloat(partes[0]) : null;
                                const longitud = partes && partes[1] ? parseFloat(partes[1]) : null;
                                

                                return (    

                                     <div 
                key={n.id} 
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
                {/* COLUMNA IZQUIERDA: INFORMACIÓN PRINCIPAL */}
                <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
                        <h4 className="font-bold text-lg text-gray-950 dark:text-white tracking-tight">
                            👤 {n.usuario ? n.usuario : 'Usuario Desconocido'}
                        </h4>

                        
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase ${
                            n.estado === 'notificado' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                            n.estado === 'citatorio' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                            'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                            {n.estado === 'acta'? 'Acta de hechos' : n.estado}
                        </span>

                        {/* 🕒 LA FECHA OFICIAL AGREGADA AQUÍ ABAJO */}
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
                        ⏱️ Realizado el: <span className="text-gray-500 dark:text-gray-400 font-semibold">{formatearFechaRegistro(n.created_at)}</span>
                    </p>
                    </div>

                    {/* SECCIÓN CENTRAL DE DATOS (Distribución en cuadrícula) */}
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                        
                        
                        {/* INDICADOR ENORME DE NÚMERO DE VISITAS (Solo si el estado es 'acta') */}
                        {n.estado === 'acta' && (
                            <div className="bg-rose-50/50 dark:bg-rose-950/10 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30 flex flex-col items-center justify-center min-w-[80px] text-center">
                                <span className="text-[10px] font-bold text-gray-400 block tracking-wider">VISITAS</span>
                                <span className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                                    {n.numero_visitas ?? 0}
                                </span>
                            </div>
                        )}

                        {/* BLOQUES DE DATOS CONDICIONALES */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                            
                            {/* Siempre mostramos el Código de Barras */}
                            <p className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800/80 flex flex-col justify-center">
                                <span className="font-semibold text-gray-400 block mb-0.5">📦 CÓDIGO BARRAS</span> 
                                <span className="font-mono text-gray-900 dark:text-gray-200">{n.codigo_barras || 'Sin código'}</span>
                            </p>

                            {/* 📅 PRÓXIMA VISITA: Solo visible si el estado es estrictamente 'citatorio' */}
                            {n.estado=== 'citatorio' && (
                                <p className="bg-amber-50/50 dark:bg-amber-950/10 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 flex flex-col justify-center">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">📅 PRÓXIMA VISITA</span> 
                                    <span className="font-medium text-amber-900 dark:text-amber-200">{n.proxima_visita || 'No programada'}</span>
                                </p>
                            )}

                            {/* 📝 MOTIVO DEL ACTA: Solo visible si el estado es estrictamente 'acta' */}
                            {n.estado === 'acta' && (
                                <p className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800/80 sm:col-span-2">
                                    <span className="font-semibold text-gray-400 block mb-0.5">📝 MOTIVO DEL ACTA</span> 
                                    <span className="text-gray-900 dark:text-gray-200">{n.motivo_acta || 'Sin observaciones'}</span>
                                </p>
                            )}
                        </div>
                    </div>

                </div>

                {/* COLUMNA DERECHA: BOTONES DE ACCIÓN */}
                <div className="w-full md:w-auto flex flex-wrap md:flex-col gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 dark:border-gray-800 justify-end">
                    
                    {/* BOTÓN GOOGLE MAPS */}
                    {latitud && longitud ? (
                        <a 
                            href={`https://www.google.com/maps/place/${latitud},${longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 shadow-sm transition-all duration-150 hover:border-gray-400 w-full md:w-44"
                        >
                            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#9D2449"/>
                            </svg>
                            Ver Ubicación en Maps
                        </a>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200 rounded-lg px-3 py-2 w-full md:w-44 cursor-not-allowed select-none">
                            📍 Sin Señal GPS
                        </div>
                    )}

                    {/* 🖼️ BOTÓN GOOGLE DRIVE: Solo visible si el estado es 'acta' */}
                    {n.estado === 'acta' && (
                        n.url_foto ? (
                            <a 
                                href={n.url_foto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 shadow-sm transition-all duration-150 hover:border-gray-400 w-full md:w-44"
                            >
                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#B38E5D"/>
                                </svg>
                                Ver Evidencia Foto
                            </a>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200 rounded-lg px-3 py-2 w-full md:w-44 cursor-not-allowed select-none">
                                🚫 Sin Evidencia Foto
                            </div>
                        )
                    )}

                    {/* ACCIONES ADMINISTRATIVAS */}
                    <div className="flex gap-2 w-full pt-2 border-t border-gray-100 dark:border-gray-800 mt-1 justify-between text-xs font-bold">
                        
                        {usuarioLogueado.role === 'administrador' && (
                            <button 
                                onClick={() => handleDelete(n.id)} 
                                className="text-rose-600 hover:text-rose-700 dark:text-rose-400 transition-colors py-1 px-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                            >
                                🗑️ Eliminar
                            </button>
                        )}
                    </div>
                </div>

                </div>
                               
                                )
                            
                            
                            })}
                        </div>

                    )}
                </div>
            </div>

        
        </div>
        </AuthenticatedLayout>
    );
}
