import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface Props {
    documentos: Array<any>;
}

export default function Agenda({ documentos }: Props) {
    // Jalamos los datos globales de sesión para pintar el nombre personalizado
    const { auth } = usePage().props as any;
    const usuarioLogueado = auth.user;

    const [docAbiertoId, setDocAbiertoId] = useState<number | null>(null);
    const [horaInicio, setHoraInicio] = useState<string | null>(null);
    
    // 🔍 🚀 NUEVO ESTADO: Para filtrar localmente en el celular al escribir
    const [busqueda, setBusqueda] = useState('');

    const formBitacora = useForm({
        estatus_registrado: 'PENDIENTE POR NOTIFICAR',
        tipo_documento_proceso: '',
        hora_inicio_visita: '',
        hora_fin_visita: '',
        ubicacion_gps: '',
        foto: null as File | null,
        observaciones_operativas: '',
    });

    // 🚀 INYECTAR ADENTRO DE TU COMPONENTE PRINCIPAL AGENDA MÓVIL:

useEffect(() => {
    /*/ 1. 📡 SOLICITUD DE HARDWARE: Pedimos permiso al empleado para lanzar alertas en su pantalla
    PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
            // Si el notificador acepta, el celular se registra en el puente de mensajería
            PushNotifications.register();
        }
    });*/

    // ESCUCHA DEL CANAL PRIVADO SEGURO DE LARAVEL REVERB
    // Escuchamos el canal exclusivo basado en el ID del notificador logueado
    (window as any).Echo.private(`user.${usuarioLogueado.id}`)
        .listen('DocumentoActualizado', (e: any) => {
            
            // A. AUTO-REFRESCO AUTOMÁTICO: Le pedimos a Inertia refrescar solo sus folios
            router.reload({ 
                only: ['documentos'] 
            });

        });

    // 🧹 Limpieza de antena al salir de la pantalla móvil
    return () => {
        (window as any).Echo.leaveChannel(`user.${usuarioLogueado.id}`);
    };
}, []);


    // 🔍 REEMPLAZA TU FILTRADO AL VUELO POR ESTA VERSIÓN CON CANDADO CONTRA NULOS:

const documentosFiltrados = documentos.filter(d => 
    // 1. Candado de oro: Solo se muestran si pertenecen al notificador activo
    d.user_id === usuarioLogueado.id && (
        // 🚀 El uso de ?.toLowerCase() || '' evita errores fatales si el campo es null en la base de datos
        (d.numero_oficio?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
        (d.numero_control?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
        (d.razon_social_contribuyente?.toLowerCase() || '').includes(busqueda.toLowerCase())
    )
);


        const iniciarDiligencia = (id: number) => {
        const ahora = new Date().toISOString();
        setHoraInicio(ahora);
        formBitacora.setData('hora_inicio_visita', ahora);
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const coordenadas = `${position.coords.latitude}, ${position.coords.longitude}`;
                formBitacora.setData('ubicacion_gps', coordenadas);
                toast.success('📍 Coordenadas GPS fijadas.', { icon: '📡' });
            });
        }
        toast('Cronómetro activado. Realiza la diligencia.', { icon: '⏱️' });
    };

    const handleRegistrarVisita = (e: React.FormEvent, documentoId: number) => {
        e.preventDefault();
        const ahoraFin = new Date().toISOString();

        router.post(`/documentos/${documentoId}/registrar-visita`, {
            ...formBitacora.data,
            hora_fin_visita: ahoraFin
        } as any, {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Acta de campo sincronizada.');
                setDocAbiertoId(null); setHoraInicio(null); formBitacora.reset();
            }
        });
    };

    return (
        <AuthenticatedLayout header={<div className="hidden sm:block text-xs font-bold text-gray-400">📲 Modo Operativo Activo</div>}>
            <Head title="Mi Agenda de Campo" />
            
            {/* Contenedor móvil gris premium con colchón inferior para botones flotantes */}
            <div className="mx-auto max-w-md bg-gray-50/50 dark:bg-gray-950 min-h-screen px-5 py-8 space-y-6 text-xs font-semibold text-gray-500 pb-24">
                

<div className="flex justify-between items-start select-none pt-4">
    <div className="space-y-1">
        {/* font-serif, italic y font-light simulan de forma hermosa el trazo manuscrito e institucional */}
        <h1 className="text-3xl font-light text-gray-800 dark:text-gray-100 tracking-tight font-serif italic">
            Hola, <span className="font-black  dark:text-rose-400 not-italic font-sans">{usuarioLogueado.name.split(' ')[0]}</span> 
        </h1>
        <p className="text-[11px] text-gray-400 font-medium tracking-wide pl-0.5 font-sans not-italic">
            Esta es tu ruta de notificaciones asignada para hoy.
        </p>
    </div>
    <div className="h-11 w-11 rounded-2xl bg-[#9D2449]/10 text-[#9D2449] font-black flex items-center justify-center border border-[#9D2449]/20 shadow-sm text-sm shrink-0">
        {usuarioLogueado.name.charAt(0)}
    </div>
</div>



                {/* BARRA DE BÚSQUEDA Y BOTÓN DE ESCÁNER */}
                <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-3.5 text-gray-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input 
                            type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por folio, oficio o contribuyente..."
                            className="w-full p-3 pt-3.5 ps-9 bg-white dark:bg-gray-800 border-0 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-[#9D2449]"
                        />
                    </div>
                    <button type="button" onClick={() => toast('Abriendo escáner...', { icon: '📷' })} className="p-3 bg-[#9D2449] hover:bg-[#7a1b38] text-white rounded-xl shadow-sm active:scale-95 shrink-0 transition-all">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM16.5 13.5v.75H18v-.75h1.5v1.5H18v1.5h-1.5v-1.5h-1.5v-1.5h1.5zM13.5 16.5h1.5v1.5h-1.5zM13.5 13.5h1.5v1.5h-1.5zM16.5 18h1.5v1.5h-1.5z" /></svg>
                    </button>
                </div>
                {/* SECCIÓN DE TARJETAS INMERSIVAS */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1 select-none">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Tus diligencias pendientes</h3>
                        <span className="text-[11px] font-bold text-[#9D2449] bg-[#9D2449]/5 px-2 py-0.5 rounded-full">{documentosFiltrados.length} folios</span>
                    </div>

                    {documentosFiltrados.length > 0 ? documentosFiltrados.map((d) => (
                        <div 
                            key={d.id}
                            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${
                                docAbiertoId === d.id ? 'border-[#9D2449] shadow-md' : 'border-gray-100 dark:border-gray-800'
                            }`}
                        >
                           
                            <div 
                onClick={() => { setDocAbiertoId(docAbiertoId === d.id ? null : d.id); setHoraInicio(null); }}
                className="p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/30 flex justify-between items-center relative border-l-4 border-transparent"
                style={{ borderLeftColor: docAbiertoId === d.id ? '#9D2449' : 'transparent' }}
            >
                <div className="space-y-1 max-w-[85%]">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                        <span>FOLIO: {d.numero_control || d.numero_oficio}</span>
                        <span>•</span>
                        <span className="text-gray-500 font-sans font-bold">{d.tipo_documento?.nombre}</span>
                    </div>
                    <h4 className="text-sm font-black tracking-tight text-gray-900 dark:text-white uppercase leading-snug">
                        {d.razon_social_contribuyente}
                    </h4>
                    <p className="text-gray-500 font-normal line-clamp-1 flex items-center gap-1 mt-0.5">
                        <svg className="h-3 w-3 shrink-0 text-[#9D2449]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.898 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {d.domicilio_contribuyente}
                    </p>

                    {d.referencias_domicilio && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium italic mt-1 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100/40 dark:border-amber-900/30">
                        Referencias: {d.referencias_domicilio}
                    </p>
                    )}
                </div>
                <span className="text-gray-300 text-xs font-bold transition-transform duration-200">
                    {docAbiertoId === d.id ? '▲' : '▼'}
                </span>
            </div>


                            {/* MÓDULO DESPLEGABLE DE CAPTURA (Se abre al dar clic) */}
                            {docAbiertoId === d.id && (
                                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/10 space-y-4 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-3 duration-200">
                                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100">
                                        <div>
                                            <span className="text-gray-400 block font-bold uppercase">RFC Contribuyente:</span> <span className="text-gray-900 dark:text-white font-mono font-bold uppercase">{d.rfc_contribuyente}</span>
                                        </div>
                                        <div className="col-span-2 border-t pt-1.5 mt-1"><span className="text-gray-400 block font-bold uppercase">Área Remitente:</span> <span className="text-gray-700 dark:text-gray-300 font-medium">{d.area?.nombre}</span></div>
                                        <div className="col-span-2 border-t pt-1.5 mt-1"><span className="text-gray-400 block font-bold uppercase">CIAC:</span> <span className="text-gray-700 dark:text-gray-300 font-medium">{d.ciac?.nombre}</span></div>
                                    </div>

                                    {!horaInicio ? (
                                        <button 
                                            type="button" onClick={() => iniciarDiligencia(d.id)}
                                            className="w-full bg-[#9D2449] hover:bg-[#7a1b38] text-white p-3 rounded-xl font-bold uppercase tracking-wider text-center active:scale-97 shadow-sm transition-all duration-150"
                                        >
                                            📍 Iniciar Diligencia (Llegué al Domicilio)
                                        </button>
                                    ) : (
                                        <form onSubmit={(e) => handleRegistrarVisita(e, d.id)} className="space-y-4 font-semibold">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-gray-400 block font-bold mb-1">Estatus Final *</label>
                                                    <select 
            value={formBitacora.data.estatus_registrado} 
            onChange={e => {
                const nuevoEstatus = e.target.value;
                
                let actaAutomatica = '';
                if (nuevoEstatus === 'VISITADO') { actaAutomatica = 'CITATORIO'; }
                else if (nuevoEstatus === 'NOTIFICADO') { actaAutomatica = 'ACTA DE NOTIFICACION'; }
                else if (nuevoEstatus === 'NO LOCALIZADO') { actaAutomatica = 'ACTA CIRCUNSTANCIADA'; }
                else if (nuevoEstatus === 'NO TRABAJADO') { actaAutomatica = ''; }

                //Se guardan los valores en el formulario de bitácora
                formBitacora.setData({
                    ...formBitacora.data,
                    estatus_registrado: nuevoEstatus,
                    tipo_documento_proceso: actaAutomatica
                });
            }}
            className="w-full p-2.5 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:bg-gray-700 text-xs focus:ring-[#9D2449]" 
            required
        >
            <option value="PENDIENTE POR NOTIFICAR" disabled hidden>Selecciona el Estatus</option>
            <option value="VISITADO">VISITADO (Dejar Citatorio)</option>
            <option value="NOTIFICADO">NOTIFICADO</option>
            <option value="NO LOCALIZADO">NO LOCALIZADO</option>
            <option value="NO TRABAJADO">NO TRABAJADO</option>
        </select>
                                                </div>
                                               <div>
        <label className="text-gray-400 block font-bold mb-1">Documento levantado*</label>
        <select 
            value={formBitacora.data.tipo_documento_proceso} 
            disabled
            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 text-xs font-bold uppercase cursor-not-allowed"
        >
            <option value="">Ningún documento (No Requerido)</option>
            <option value="CITATORIO">CITATORIO</option>
            <option value="ACTA DE NOTIFICACION">ACTA DE NOTIFICACIÓN</option>
            <option value="ACTA CIRCUNSTANCIADA">ACTA CIRCUNSTANCIADA DE HECHOS</option>
        </select>
    </div>
                                            </div>


{formBitacora.data.estatus_registrado !== 'NO TRABAJADO' && (                                        
<div>
    <label className="text-gray-400 block font-bold mb-1">Evidencia Fotográfica Obligatoria *</label>
    <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-3 bg-white dark:bg-gray-900">
        <input 
            type="file" 
            accept="image/*" 
            capture="environment" //Fuerza a abrir estrictamente la cámara trasera física
            onChange={e => formBitacora.setData('foto', e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            className="text-xs text-gray-500 cursor-pointer w-full file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-[#9D2449]/10 file:text-[#9D2449] file:font-bold" 
            required 
        />
    </div>
    <span className="text-[10px] text-amber-600 block mt-1 font-normal">
        ⚠️ Nota: El sistema solo permite capturas en tiempo real. No se admiten archivos de la galería.
    </span>
</div>
)}

                                            <div>
                                                <label className="text-gray-400 block font-bold mb-1">Observaciones de Campo *</label>
                                                <textarea value={formBitacora.data.observaciones_operativas} onChange={e => formBitacora.setData('observaciones_operativas', e.target.value)} placeholder="Describe incidencias físicas de la visita..." required className="w-full p-2.5 border-gray-200 rounded-xl text-gray-900 dark:bg-gray-700 font-normal focus:ring-[#9D2449]" rows={3} />
                                            </div>

                                            <button type="submit" disabled={formBitacora.processing} className="w-full bg-institucional hover:bg-institucional-hover text-white p-3 rounded-xl font-bold uppercase tracking-wider shadow transition duration-150 active:scale-97">
                                                {formBitacora.processing ? 'Sincronizando...' : 'Guardar y Finalizar Diligencia'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 text-gray-400 italic">No tienes diligencias asignadas con ese criterio en tu ruta.</div>
                    )}
                </div>
            </div>
            <Toaster />
        </AuthenticatedLayout>
    );
}
