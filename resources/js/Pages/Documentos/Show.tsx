import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import React, { useState } from 'react';

interface Props {
    documento: any;     // Contiene los datos del oficio y su bitácora
    roleUsuario: string; // Contiene el rol del usuario ('administrador' o 'notificador')
}

export default function Show({ documento, roleUsuario }: Props) {

    const [imagenExpandida, setImagenExpandida] = useState<string | null>(null);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center text-xs sm:text-sm">
                     <h2 className="text-xl font-bold leading-tight text-gray-800 dark:text-gray-200">
                        Documento {documento.numero_control ? `N° Control ${documento.numero_control}` : `N°Oficio ${documento.numero_oficio}`}
                    </h2>
                    <Link href={route('documentos.cargar')} className="text-xs font-bold text-gray-500 hover:text-[#9D2449] transition-colors">
                        ← Volver al Inventario
                    </Link>
                </div>
            }
        >
            <Head title={`Detalle Oficio ${documento.numero_oficio}`} />

            {/* Contenedor Grid: 1 columna en celulares, 3 columnas en computadoras */}
            <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* COLUMNA IZQUIERDA: ATRIBUTOS DEL DOCUMENTO */}
                    {/* REMPLAZA EL BLOQUE DE LA COLUMNA IZQUIERDA (Bloque 3.3 anterior) POR ESTA VERSIÓN AMPLIADA: */}
<div className="lg:col-span-1 space-y-6 text-xs font-medium text-gray-500">
    
    {/* Tarjeta 1: Datos Generales y Estatus Actual */}
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between border-b pb-2 border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Datos del Oficio
            </h3>
            {/* Indicador de Estatus Actual */}
            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                documento.estatus === 'NOTIFICADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                documento.estatus === 'PENDIENTE POR NOTIFICAR' ? 'bg-gray-50 text-gray-500 border-gray-200' : 
                documento.estatus === 'VISITADO' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                'bg-red-50 text-red-700 border-red-200'
            }`}>
                {documento.estatus}
            </span>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Razón Social</label>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{documento.razon_social_contribuyente}</span>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">RFC Oficial</label>
            <span className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200 uppercase">{documento.rfc_contribuyente}</span>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Domicilio Fiscal</label>
            <span className="text-gray-700 dark:text-gray-300 font-normal block mt-0.5 leading-normal">{documento.domicilio_contribuyente}</span>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Referencias de Ubicación</label>
            <span className="text-gray-600 dark:text-gray-400 font-normal italic block mt-0.5 leading-relaxed bg-gray-50 dark:bg-gray-900/60 p-2 rounded-lg">
                {documento.referencias_domicilio || 'Sin referencias registradas.'}
            </span>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Fecha de Emisión del Oficio</label>
            <span className="text-gray-700 dark:text-gray-300 font-bold block mt-0.5">{documento.fecha_doc_legible}</span>
        </div>
    </div>

    {/* Tarjeta 2: Detalles*/}
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider border-b pb-2 border-gray-100 dark:border-gray-700">
            Detalles
        </h3>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold">Número</label>
                <span className="font-bold text-gray-900 dark:text-white">{documento.numero_control ? `Control ${documento.numero_control}` : `Oficio ${documento.numero_oficio}`}</span>
            </div>
            <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold">Código CIAC</label>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{documento.ciac_asignado || 'N/A'}</span>
            </div>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Área de Origen / Tipo</label>
            <span className="text-gray-800 dark:text-gray-200 block font-semibold">{documento.area?.nombre}</span>
            <span className="text-[10px] text-gray-400 block font-medium mt-0.5">{documento.tipo_documento?.nombre}</span>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Notificador Asignado Actual</label>
            <span className="text-institucional dark:text-purple-400 font-bold block mt-0.5">
                {documento.user ? `${documento.user.name}` : 'Pendiente por asignar'}
            </span>
        </div>
        <div className="border-t pt-2 dark:border-gray-700">
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Fecha de Asignación Inicial</label>
            <span className="text-gray-600 dark:text-gray-400 font-normal block mt-0.5 leading-snug">{documento.primera_asig_legible}</span>
        </div>
        <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold">Última Reasignación de Turno</label>
            <span className="text-gray-600 dark:text-gray-400 font-normal block mt-0.5 leading-snug">{documento.ultima_asig_legible}</span>
        </div>
    </div>
</div>

                                        {/* COLUMNA DERECHA: TIMELINE CON TARJETAS MODERNAS */}
                    <div className="lg:col-span-2 bg-gray-50/50 dark:bg-gray-900/10 p-2 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-8 px-2">
                            {roleUsuario === 'administrador' ? 'Bitácora Completa de Notificaciones' : 'Historial de Antecedentes'}
                        </h3>
                        
                        {documento.bitacora && documento.bitacora.length > 0 ? (
                            <div className="relative border-l border-gray-200 dark:border-gray-700 ms-4 space-y-6">
                                {documento.bitacora.map((b: any) => (
                                    <div key={b.id} className="relative ps-6 text-xs font-semibold">
                                        
                                        {/* Nodo Conector de la línea */}
                                        <div className={`absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full border bg-white dark:bg-gray-800 transition-all ${
                                            b.estatus_registrado === 'NOTIFICADO' ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
                                            b.estatus_registrado === 'NO LOCALIZADO' ? 'border-amber-500 bg-amber-500' : 'border-[#9D2449]'
                                        }`} />

                                        {/* LA TARJETA COMPACTA DE DOBLE COLUMNA */}
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                                            
                                            {/* SUB-BLOQUE IZQUIERDO: TEXTOS, ACTAS Y OBSERVACIONES */}
                                            <div className="space-y-3 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 text-gray-500">
                                                    <span className="font-black text-gray-900 dark:text-gray-100 text-sm">{b.user?.name || 'Sistema SEFIN'}</span>
                                                    <span>•</span>
                                                    <span className="font-sans font-semibold text-[#9D2449] dark:text-rose-400 bg-[#9D2449]/5 px-2 py-0.5 rounded text-[10px] capitalize">{b.fecha_legible}</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2 items-center">
                                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                                                        b.estatus_registrado === 'NOTIFICADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        b.estatus_registrado === 'PENDIENTE POR NOTIFICAR' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                                                        b.estatus_registrado === 'VISITADO' ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                        Estatus: {b.estatus_registrado}
                                                    </span>
                                                    {b.tipo_documento_proceso && (
                                                        <span className="inline-flex items-center bg-institucional-claro dark:bg-purple-950/30 text-institucional dark:text-purple-400 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-purple-200/60">
                                                            📄 {b.tipo_documento_proceso}
                                                        </span>
                                                    )}
                                                </div>

                                                {b.observaciones_operativas && (
                                                    <p className="text-gray-600 dark:text-gray-400 font-normal bg-gray-50/50 dark:bg-gray-900/30 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800/80 leading-relaxed text-xs">
                                                        "{b.observaciones_operativas}"
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px] font-mono text-gray-400">
                                                   
                                                    {b.ubicacion_gps && (
                                                        <a 
                            href={`https://www.google.com/maps/place/${b.ubicacion_gps}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 shadow-sm transition-all duration-150 hover:border-gray-400 w-full sm:w-auto text-center"
                        >
                            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#9D2449"/>
                            </svg>
                            Ver Ubicación en Maps
                        </a>
                                                 )}

                                                  {b.minutos_permanencia !== null && (
                                                        <span className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded">⏱Tiempo de permanencia: {b.minutos_permanencia} min</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* SUB-BLOQUE DERECHO: MINIATURA DE LA FOTO INTERACTIVA */}
                                            {b.url_foto && (
                                                <div 
                                                    onClick={() => setImagenExpandida(b.url_foto)} // 🚀 Dispara el Lightbox al hacer click
                                                    className="shrink-0 w-full sm:w-24 h-24 relative overflow-hidden rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm bg-gray-50 group cursor-zoom-in"
                                                >
                                                    <img 
                                                        src={b.url_foto} alt="Evidencia de campo" 
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                        onError={(e: any) => e.target.style.display = 'none'}
                                                    />
                                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">🔍 VER</div>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-8 text-gray-400 italic bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">📋 Este documento inicial no cuenta con movimientos registrados en su bitácora histórica.</div>
                        )}
                    </div>
                </div>
            </div>

                        {imagenExpandida && (
                <div 
                    onClick={() => setImagenExpandida(null)} // Cierra el zoom al dar click en el fondo oscuro
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
                >
                    <div 
                        onClick={e => e.stopPropagation()} // Evita que el modal se cierre si das click en la foto misma
                        className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-stone-900 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
                    >
                        {/* Botón circular de cerrar */}
                        <button onClick={() => setImagenExpandida(null)} className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white font-black text-xs h-7 w-7 rounded-full flex items-center justify-center border border-white/10 transition-colors z-10">✕</button>
                        
                        <img 
                            src={imagenExpandida} 
                            alt="Evidencia Ampliada" 
                            className="w-full h-auto max-h-[85vh] object-contain"
                        />
                        
                    </div>
                </div>
            )}
                
        </AuthenticatedLayout>
    );
}
