import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm, router, usePage } from "@inertiajs/react";
import React, { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Html5QrcodeScanner } from "html5-qrcode";
import axios from "axios";
import {
    guardarVisitaOffline,
    obtenerVisitasPendientes,
    eliminarVisitaPendiente,
    guardarAgendaCache,
    obtenerAgendaCache,
} from "@/utils/offlineStore";

interface Props {
    documentos: Array<any>;
}

export default function Agenda({ documentos }: Props) {
    // Jalamos los datos globales de sesión para pintar el nombre personalizado
    const { auth } = usePage().props as any;
    const usuarioLogueado = auth.user;

    const [docsList, setDocsList] = useState<any[]>(documentos || []);
    const [pendingVisitasIds, setPendingVisitasIds] = useState<number[]>([]);
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const syncingRef = useRef(false);

    const [docAbiertoId, setDocAbiertoId] = useState<number | null>(null);
    const [horaInicio, setHoraInicio] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // 🔍 🚀 NUEVO ESTADO: Para filtrar localmente en el celular al escribir
    const [busqueda, setBusqueda] = useState("");

    const formBitacora = useForm({
        estatus_registrado: "PENDIENTE POR NOTIFICAR",
        tipo_documento_proceso: "",
        hora_inicio_visita: "",
        hora_fin_visita: "",
        ubicacion_gps: "",
        foto: null as File | null,
        observaciones_operativas: "",
    });

    // 1. Guardar o recuperar caché de agenda en IndexedDB
    useEffect(() => {
        if (documentos && documentos.length > 0) {
            setDocsList(documentos);
            guardarAgendaCache(documentos);
        } else if (!navigator.onLine) {
            obtenerAgendaCache().then((cached) => {
                if (cached && cached.length > 0) {
                    setDocsList(cached);
                }
            });
        }
    }, [documentos]);

    // 2. Cargar visitas pendientes de sincronización al iniciar
    useEffect(() => {
        obtenerVisitasPendientes().then((pendientes) => {
            setPendingVisitasIds(pendientes.map((p) => p.documentoId));
        });

        if (!navigator.onLine) {
            obtenerAgendaCache().then((cached) => {
                if (cached && cached.length > 0) {
                    setDocsList(cached);
                }
            });
        }
    }, []);

    // 3. Función de Sincronización 100% Automática y Desatendida
    const autoSincronizar = async () => {
        if (!navigator.onLine || syncingRef.current) return;

        try {
            const pendientes = await obtenerVisitasPendientes();
            if (pendientes.length === 0) return;

            syncingRef.current = true;
            setIsSyncing(true);
            let exitosos = 0;

            for (const item of pendientes) {
                try {
                    const formData = new FormData();
                    formData.append("estatus_registrado", item.data.estatus_registrado);
                    formData.append("tipo_documento_proceso", item.data.tipo_documento_proceso || "");
                    formData.append("hora_inicio_visita", item.data.hora_inicio_visita);
                    formData.append("hora_fin_visita", item.data.hora_fin_visita);
                    formData.append("ubicacion_gps", item.data.ubicacion_gps);
                    formData.append("observaciones_operativas", item.data.observaciones_operativas);

                    if (item.fotoBlob) {
                        const file = new File(
                            [item.fotoBlob],
                            item.fotoName || `evidencia_${item.documentoId}.jpg`,
                            { type: item.fotoBlob.type || "image/jpeg" }
                        );
                        formData.append("foto", file);
                    }

                    await axios.post(
                        `/documentos/${item.documentoId}/registrar-visita`,
                        formData,
                        {
                            headers: {
                                "Content-Type": "multipart/form-data",
                                Accept: "application/json",
                            },
                        }
                    );

                    if (item.id !== undefined) {
                        await eliminarVisitaPendiente(item.id);
                    }
                    exitosos++;
                } catch (err) {
                    console.error(`Error al sincronizar diligencia #${item.documentoId}:`, err);
                    // Si se corta la señal en pleno envío, detener para reintentar al reconectar
                    break;
                }
            }

            const restantes = await obtenerVisitasPendientes();
            setPendingVisitasIds(restantes.map((r) => r.documentoId));

            if (exitosos > 0) {
                toast.success(
                    exitosos === 1
                        ? "✅ 1 diligencia sincronizada automáticamente con éxito."
                        : `✅ ${exitosos} diligencias sincronizadas automáticamente con éxito.`,
                    { icon: "📡", duration: 4500 }
                );
                router.reload({ only: ["documentos"] });
            }
        } finally {
            syncingRef.current = false;
            setIsSyncing(false);
        }
    };

    // 4. Monitoreo automático de conexión a internet
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success("Señal de internet recuperada. Sincronizando...", {
                icon: "📶",
                duration: 3000,
            });
            autoSincronizar();
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast("Sin conexión a internet. Modo fuera de línea activo.", {
                icon: "⚠️",
                duration: 3500,
            });
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Monitor de sincronización cada 20 segundos por si recupera señal
        const syncInterval = setInterval(() => {
            if (navigator.onLine) {
                autoSincronizar();
            }
        }, 20000);

        // Intento de sincronización al cargar
        autoSincronizar();

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            clearInterval(syncInterval);
        };
    }, []);

    // Consulta periódica si hay conexión activa
    useEffect(() => {
        const intervalo = setInterval(() => {
            if (!document.hidden && navigator.onLine) {
                router.reload({
                    only: ['documentos'],
                });
            }
        }, 15000);

        return () => clearInterval(intervalo);
    }, []);

    // Efecto para inicializar el escáner de QR cuando isScanning es true
    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        if (isScanning) {
            scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                },
                false,
            );

            scanner.render(
                (decodedText) => {
                    setBusqueda(decodedText);
                    setIsScanning(false);
                    scanner?.clear();
                    toast.success(`Código detectado: ${decodedText}`);

                    const docCoincidente = docsList.find(
                        (d) =>
                            d.numero_control === decodedText ||
                            d.numero_oficio === decodedText,
                    );
                    if (docCoincidente) {
                        setDocAbiertoId(docCoincidente.id);
                    }
                },
                () => {},
            );
        }

        return () => {
            if (scanner) {
                scanner
                    .clear()
                    .catch((err) =>
                        console.error("Error al limpiar scanner", err),
                    );
            }
        };
    }, [isScanning, docsList]);

    const documentosFiltrados = docsList.filter(
        (d) =>
            d.user_id === usuarioLogueado.id &&
            ((d.numero_oficio?.toLowerCase() || "").includes(
                busqueda.toLowerCase(),
            ) ||
                (d.numero_control?.toLowerCase() || "").includes(
                    busqueda.toLowerCase(),
                ) ||
                (d.razon_social_contribuyente?.toLowerCase() || "").includes(
                    busqueda.toLowerCase(),
                )),
    );

    const iniciarDiligencia = (id: number) => {
        const ahora = new Date().toISOString();
        setHoraInicio(ahora);
        formBitacora.setData("hora_inicio_visita", ahora);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const coordenadas = `${position.coords.latitude}, ${position.coords.longitude}`;
                formBitacora.setData("ubicacion_gps", coordenadas);
                toast.success("📍 Coordenadas GPS fijadas.", { icon: "📡" });
            });
        }
        toast("Cronómetro activado. Realiza la diligencia.", { icon: "⏱️" });
    };

    const handleRegistrarVisita = async (e: React.FormEvent, documentoId: number) => {
        e.preventDefault();
        const ahoraFin = new Date().toISOString();

        // 1. Si no hay conexión en este instante, guardar de inmediato en IndexedDB
        if (!navigator.onLine) {
            try {
                await guardarVisitaOffline({
                    documentoId,
                    data: {
                        estatus_registrado: formBitacora.data.estatus_registrado,
                        tipo_documento_proceso: formBitacora.data.tipo_documento_proceso,
                        hora_inicio_visita: formBitacora.data.hora_inicio_visita || ahoraFin,
                        hora_fin_visita: ahoraFin,
                        ubicacion_gps: formBitacora.data.ubicacion_gps || "0, 0",
                        observaciones_operativas: formBitacora.data.observaciones_operativas,
                    },
                    fotoBlob: formBitacora.data.foto ? formBitacora.data.foto : null,
                    fotoName: formBitacora.data.foto ? formBitacora.data.foto.name : null,
                    timestamp: ahoraFin,
                });

                setPendingVisitasIds((prev) => [...prev, documentoId]);
                toast.success(
                    "📍 Diligencia guardada en el teléfono. Se enviará automáticamente cuando el celular detecte señal.",
                    { duration: 5500, icon: "💾" }
                );
                setDocAbiertoId(null);
                setHoraInicio(null);
                formBitacora.reset();
            } catch (error) {
                console.error("Error al guardar visita offline:", error);
                toast.error("Error al guardar en memoria local.");
            }
            return;
        }

        // 2. Si hay conexión, enviar normalmente
        router.post(
            `/documentos/${documentoId}/registrar-visita`,
            {
                ...formBitacora.data,
                hora_fin_visita: ahoraFin,
            } as any,
            {
                forceFormData: true,
                onSuccess: () => {
                    toast.success("Acta de campo sincronizada.");
                    setDocAbiertoId(null);
                    setHoraInicio(null);
                    formBitacora.reset();
                },
                onError: async () => {
                    // Si se corta la señal durante el envío, rescatar en IndexedDB
                    if (!navigator.onLine) {
                        try {
                            await guardarVisitaOffline({
                                documentoId,
                                data: {
                                    estatus_registrado: formBitacora.data.estatus_registrado,
                                    tipo_documento_proceso: formBitacora.data.tipo_documento_proceso,
                                    hora_inicio_visita: formBitacora.data.hora_inicio_visita || ahoraFin,
                                    hora_fin_visita: ahoraFin,
                                    ubicacion_gps: formBitacora.data.ubicacion_gps || "0, 0",
                                    observaciones_operativas: formBitacora.data.observaciones_operativas,
                                },
                                fotoBlob: formBitacora.data.foto ? formBitacora.data.foto : null,
                                fotoName: formBitacora.data.foto ? formBitacora.data.foto.name : null,
                                timestamp: ahoraFin,
                            });
                            setPendingVisitasIds((prev) => [...prev, documentoId]);
                            toast.success(
                                "📍 Conexión interrumpida. Guardado en memoria para sincronización automática.",
                                { duration: 5500, icon: "💾" }
                            );
                            setDocAbiertoId(null);
                            setHoraInicio(null);
                            formBitacora.reset();
                        } catch (err) {
                            console.error(err);
                        }
                    }
                },
            },
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Mi Agenda de Campo" />

            {/* Contenedor móvil gris premium con colchón inferior para botones flotantes */}
            <div className="mx-auto max-w-7xl w-full bg-gray-50/50 dark:bg-gray-950 min-h-screen px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-xs font-semibold text-gray-500 pb-24">
                <div className="flex justify-between items-start select-none pt-4">
                    <div className="space-y-1">
                        {/* font-serif, italic y font-light simulan de forma hermosa el trazo manuscrito e institucional */}
                        <h1 className="text-3xl font-light text-gray-800 dark:text-gray-100 tracking-tight font-serif italic">
                            Hola,{" "}
                            <span className="font-black  dark:text-rose-400 not-italic font-sans">
                                {usuarioLogueado.name.split(" ")[0]}
                            </span>
                        </h1>
                        <p className="text-[11px] text-gray-400 font-medium tracking-wide pl-0.5 font-sans not-italic">
                            Esta es tu ruta de notificaciones asignada para hoy.
                        </p>
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                            {!isOnline ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                    <span>Modo Sin Conexión (Offline)</span>
                                </span>
                            ) : isSyncing ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-spin"></span>
                                    <span>Sincronizando automáticamente...</span>
                                </span>
                            ) : null}

                            {pendingVisitasIds.length > 0 && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300/50">
                                    ⏳ {pendingVisitasIds.length} diligencia(s) guardadas en espera de señal
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-11 w-11 rounded-2xl bg-[#9D2449]/10 text-[#9D2449] font-black flex items-center justify-center border border-[#9D2449]/20 shadow-sm text-sm shrink-0">
                        {usuarioLogueado.name.charAt(0)}
                    </div>
                </div>

                {/* VISOR DE CÁMARA */}
{isScanning && (
    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-[#9D2449] rounded-2xl p-4 shadow-md space-y-2 animate-in fade-in duration-200">
        <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Apunta la cámara al código de barras:
            </span>
            <button
                type="button"
                onClick={() => setIsScanning(false)}
                className="text-[11px] font-bold text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg"
            >
                Cancelar
            </button>
        </div>
        <div id="reader" className="w-full overflow-hidden rounded-xl"></div>
    </div>
)}

                {/* BARRA DE BÚSQUEDA Y BOTÓN DE ESCÁNER */}
                <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-3.5 text-gray-400">
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por folio, oficio o contribuyente..."
                            className="w-full p-3 pt-3.5 ps-9 bg-white dark:bg-gray-800 border-0 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-[#9D2449]"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsScanning(!isScanning)}
                        className={`p-3 text-white rounded-xl shadow-sm active:scale-95 shrink-0 transition-all ${
                            isScanning
                                ? "bg-gray-700 hover:bg-gray-800"
                                : "bg-[#9D2449] hover:bg-[#7a1b38]"
                        }`}
                        title={
                            isScanning
                                ? "Cerrar escáner"
                                : "Escanear código de barras"
                        }
                    >
                        {isScanning ? (
                            <span className="text-xs font-bold px-1">✕</span>
                        ) : (
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM16.5 13.5v.75H18v-.75h1.5v1.5H18v1.5h-1.5v-1.5h-1.5v-1.5h1.5zM13.5 16.5h1.5v1.5h-1.5zM13.5 13.5h1.5v1.5h-1.5zM16.5 18h1.5v1.5h-1.5z"
                                />
                            </svg>
                        )}
                    </button>
                </div>
                {/* SECCIÓN DE TARJETAS INMERSIVAS */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1 select-none">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
                            Tus diligencias pendientes
                        </h3>
                        <span className="text-[11px] font-bold text-[#9D2449] bg-[#9D2449]/5 px-2 py-0.5 rounded-full">
                            {documentosFiltrados.length} folios
                        </span>
                    </div>

                    {documentosFiltrados.length > 0 ? (
                        documentosFiltrados.map((d) => (
                            <div
                                key={d.id}
                                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${
                                    docAbiertoId === d.id
                                        ? "border-[#9D2449] shadow-md"
                                        : "border-gray-100 dark:border-gray-800"
                                }`}
                            >
                                <div
                                    onClick={() => {
                                        setDocAbiertoId(
                                            docAbiertoId === d.id ? null : d.id,
                                        );
                                        setHoraInicio(null);
                                    }}
                                    className="p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/30 flex justify-between items-center relative border-l-4 border-transparent"
                                    style={{
                                        borderLeftColor:
                                            docAbiertoId === d.id
                                                ? "#9D2449"
                                                : "transparent",
                                    }}
                                >
                                    <div className="space-y-1 max-w-[85%]">
                                        <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                                            <span>
                                                FOLIO:{" "}
                                                {d.numero_control ||
                                                    d.numero_oficio}
                                            </span>
                                            <span>•</span>
                                            <span className="text-gray-500 font-sans font-bold">
                                                {d.tipo_documento?.nombre}
                                            </span>
                                            {pendingVisitasIds.includes(d.id) && (
                                                <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[9px] px-2 py-0.5 rounded-full font-bold ml-1 animate-pulse border border-amber-300">
                                                    ⏳ Guardado en teléfono (Pendiente de envío)
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-sm font-black tracking-tight text-gray-900 dark:text-white uppercase leading-snug">
                                            {d.razon_social_contribuyente}
                                        </h4>
                                        <p className="text-gray-500 font-normal line-clamp-1 flex items-center gap-1 mt-0.5">
                                            <svg
                                                className="h-3 w-3 shrink-0 text-[#9D2449]/60"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.898 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                />
                                            </svg>
                                            {d.domicilio_contribuyente}
                                        </p>

                                        {d.referencias_domicilio && (
                                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium italic mt-1 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100/40 dark:border-amber-900/30">
                                                Referencias:{" "}
                                                {d.referencias_domicilio}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-gray-300 text-xs font-bold transition-transform duration-200">
                                        {docAbiertoId === d.id ? "▲" : "▼"}
                                    </span>
                                </div>

                                {/* MÓDULO DESPLEGABLE DE CAPTURA (Se abre al dar clic) */}
                                {docAbiertoId === d.id && (
                                    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/10 space-y-4 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-3 duration-200">
                                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100">
                                            <div>
                                                <span className="text-gray-400 block font-bold uppercase">
                                                    RFC Contribuyente:
                                                </span>{" "}
                                                <span className="text-gray-900 dark:text-white font-mono font-bold uppercase">
                                                    {d.rfc_contribuyente}
                                                </span>
                                            </div>
                                            <div className="col-span-2 border-t pt-1.5 mt-1">
                                                <span className="text-gray-400 block font-bold uppercase">
                                                    Área Remitente:
                                                </span>{" "}
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                    {d.area?.nombre}
                                                </span>
                                            </div>
                                            <div className="col-span-2 border-t pt-1.5 mt-1">
                                                <span className="text-gray-400 block font-bold uppercase">
                                                    CIAC:
                                                </span>{" "}
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                    {d.ciac?.nombre}
                                                </span>
                                            </div>
                                        </div>

                                        {pendingVisitasIds.includes(d.id) ? (
                                            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-center space-y-1.5">
                                                <p className="font-bold text-amber-800 dark:text-amber-300 text-xs flex items-center justify-center gap-1.5">
                                                    <span>⏳</span> Diligencia guardada en el teléfono
                                                </p>
                                                <p className="text-[11px] text-amber-700/90 dark:text-amber-400">
                                                    El acta y la fotografía de evidencia están almacenadas en la memoria local. Se sincronizarán automáticamente con el servidor en cuanto el celular detecte señal de internet.
                                                </p>
                                            </div>
                                        ) : !horaInicio ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    iniciarDiligencia(d.id)
                                                }
                                                className="w-full bg-[#9D2449] hover:bg-[#7a1b38] text-white p-3 rounded-xl font-bold uppercase tracking-wider text-center active:scale-97 shadow-sm transition-all duration-150"
                                            >
                                                📍 Iniciar Diligencia (Llegué al
                                                Domicilio)
                                            </button>
                                        ) : (
                                            <form
                                                onSubmit={(e) =>
                                                    handleRegistrarVisita(
                                                        e,
                                                        d.id,
                                                    )
                                                }
                                                className="space-y-4 font-semibold"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-gray-400 block font-bold mb-1">
                                                            Estatus Final *
                                                        </label>
                                                        <select
                                                            value={
                                                                formBitacora
                                                                    .data
                                                                    .estatus_registrado
                                                            }
                                                            onChange={(e) => {
                                                                const nuevoEstatus =
                                                                    e.target
                                                                        .value;

                                                                let actaAutomatica =
                                                                    "";
                                                                if (
                                                                    nuevoEstatus ===
                                                                    "VISITADO"
                                                                ) {
                                                                    actaAutomatica =
                                                                        "CITATORIO";
                                                                } else if (
                                                                    nuevoEstatus ===
                                                                    "NOTIFICADO"
                                                                ) {
                                                                    actaAutomatica =
                                                                        "ACTA DE NOTIFICACION";
                                                                } else if (
                                                                    nuevoEstatus ===
                                                                    "NO LOCALIZADO"
                                                                ) {
                                                                    actaAutomatica =
                                                                        "ACTA CIRCUNSTANCIADA";
                                                                } else if (
                                                                    nuevoEstatus ===
                                                                    "NO TRABAJADO"
                                                                ) {
                                                                    actaAutomatica =
                                                                        "";
                                                                }

                                                                //Se guardan los valores en el formulario de bitácora
                                                                formBitacora.setData(
                                                                    {
                                                                        ...formBitacora.data,
                                                                        estatus_registrado:
                                                                            nuevoEstatus,
                                                                        tipo_documento_proceso:
                                                                            actaAutomatica,
                                                                    },
                                                                );
                                                            }}
                                                            className="w-full p-2.5 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:bg-gray-700 text-xs focus:ring-[#9D2449]"
                                                            required
                                                        >
                                                            <option
                                                                value="PENDIENTE POR NOTIFICAR"
                                                                disabled
                                                                hidden
                                                            >
                                                                Selecciona el
                                                                Estatus
                                                            </option>
                                                            <option value="VISITADO">
                                                                VISITADO (Dejar
                                                                Citatorio)
                                                            </option>
                                                            <option value="NOTIFICADO">
                                                                NOTIFICADO
                                                            </option>
                                                            <option value="NO LOCALIZADO">
                                                                NO LOCALIZADO
                                                            </option>
                                                            <option value="NO TRABAJADO">
                                                                NO TRABAJADO
                                                            </option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-gray-400 block font-bold mb-1">
                                                            Documento levantado*
                                                        </label>
                                                        <select
                                                            value={
                                                                formBitacora
                                                                    .data
                                                                    .tipo_documento_proceso
                                                            }
                                                            disabled
                                                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 text-xs font-bold uppercase cursor-not-allowed"
                                                        >
                                                            <option value="">
                                                                Ningún documento
                                                                (No Requerido)
                                                            </option>
                                                            <option value="CITATORIO">
                                                                CITATORIO
                                                            </option>
                                                            <option value="ACTA DE NOTIFICACION">
                                                                ACTA DE
                                                                NOTIFICACIÓN
                                                            </option>
                                                            <option value="ACTA CIRCUNSTANCIADA">
                                                                ACTA
                                                                CIRCUNSTANCIADA
                                                                DE HECHOS
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {formBitacora.data
                                                    .estatus_registrado !==
                                                    "NO TRABAJADO" && (
                                                    <div>
                                                        <label className="text-gray-400 block font-bold mb-1">
                                                            Evidencia
                                                            Fotográfica
                                                            Obligatoria *
                                                        </label>
                                                        <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-3 bg-white dark:bg-gray-900">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                capture="environment" //Fuerza a abrir estrictamente la cámara trasera física
                                                                onChange={(e) =>
                                                                    formBitacora.setData(
                                                                        "foto",
                                                                        e.target
                                                                            .files &&
                                                                            e
                                                                                .target
                                                                                .files[0]
                                                                            ? e
                                                                                  .target
                                                                                  .files[0]
                                                                            : null,
                                                                    )
                                                                }
                                                                className="text-xs text-gray-500 cursor-pointer w-full file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-[#9D2449]/10 file:text-[#9D2449] file:font-bold"
                                                                required
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-amber-600 block mt-1 font-normal">
                                                            ⚠️ Nota: El sistema
                                                            solo permite
                                                            capturas en tiempo
                                                            real. No se admiten
                                                            archivos de la
                                                            galería.
                                                        </span>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-gray-400 block font-bold mb-1">
                                                        Observaciones de Campo *
                                                    </label>
                                                    <textarea
                                                        value={
                                                            formBitacora.data
                                                                .observaciones_operativas
                                                        }
                                                        onChange={(e) =>
                                                            formBitacora.setData(
                                                                "observaciones_operativas",
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Describe incidencias físicas de la visita..."
                                                        required
                                                        className="w-full p-2.5 border-gray-200 rounded-xl text-gray-900 dark:bg-gray-700 font-normal focus:ring-[#9D2449]"
                                                        rows={3}
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={
                                                        formBitacora.processing
                                                    }
                                                    className="w-full bg-institucional hover:bg-institucional-hover text-white p-3 rounded-xl font-bold uppercase tracking-wider shadow transition duration-150 active:scale-97"
                                                >
                                                    {formBitacora.processing
                                                        ? "Sincronizando..."
                                                        : "Guardar y Finalizar Diligencia"}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 text-gray-400 italic">
                            No tienes diligencias asignadas con ese criterio en
                            tu ruta.
                        </div>
                    )}
                </div>
            </div>
            <Toaster />
        </AuthenticatedLayout>
    );
}
