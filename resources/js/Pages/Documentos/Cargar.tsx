import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm, Link, router } from "@inertiajs/react";
import React, { useState, useEffect } from 'react';
import toast, { Toaster } from "react-hot-toast";

interface Props {
    areas: Array<{ id: number; nombre: string }>;
    tiposDocumento: Array<{ id: number; nombre: string }>;
    ciacs: Array<{ id: number; nombre: string }>;
    notificadores: Array<{ id: number; name: string }>;
    roleUsuario: string;
    areaUsuario: string;
    ciacUsuario: string;
    documentos: {
        data: Array<any>;
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        total: number;
    };
    filtros: {
        rfc?: string;
        area_id?: string;
        estatus?: string;
        ciac?: string;
        fecha?: string;
        user_id?: string;
    };
}

export default function Cargar({
    areas,
    tiposDocumento,
    ciacs,
    notificadores,
    documentos,
    filtros,
    roleUsuario,
    areaUsuario,
    ciacUsuario
}: Props) {
    const [modalExcel, setModalExcel] = useState(false);
    const [modalIndividual, setModalIndividual] = useState(false);

    // Estados locales para los filtros dinámicos
    const [rfc, setRfc] = useState(filtros.rfc || "");
    const [areaId, setAreaId] = useState(filtros.area_id || '');
    const [estatus, setEstatus] = useState(filtros.estatus || "");
    const [ciac, setCiac] = useState(filtros.ciac || "");
    const [fecha, setFecha] = useState(filtros.fecha || "");
    // Estado para almacenar los IDs seleccionados
    const [seleccionados, setSeleccionados] = useState<number[]>([]);
    // Estado para saber si estamos editando un documento específico
    const [editId, setEditId] = useState<number | null>(null);
    const [filtroUserId, setFiltroUserId] = useState(filtros.user_id || "");

    const formMasivo = useForm({ archivo_excel: null as File | null });
    const formIndividual = useForm({
        numero_control: "",
        numero_oficio: "",
        ciac_id: (roleUsuario === 'coordinador_ciac') ? ciacUsuario : '',
        rfc_contribuyente: "",
        razon_social_contribuyente: "",
        domicilio_contribuyente: "",
        fecha_documento: "",
        referencias_domicilio: '',
        area_id: (roleUsuario === 'coordinador_area') ? areaUsuario : '',
        tipo_documento_id: "",
        user_id: "",
    });


    /*WEBSOCKET DE LARAVEL REVERB
    useEffect(() => {
    // Escuchamos el canal público que definimos en Laravel para recibir eventos de actualización de documentos
    (window as any).Echo.channel('sefin-canal')
        .listen('DocumentoActualizado', (e: any) => {
            
            // Recarga silenciosamente los datos de PostgreSQL
            router.reload({ 
                only: ['documentos']
            });

            // Mostramos una alerta minimalista en pantalla informando el refresco
            toast.success('Inventario sincronizado en tiempo real por el servidor.', {
                icon: '🔄',
                duration: 2500
            });
        });

    // Limpieza de antena: Si el Administrador sale de esta pantalla, apagamos la escucha
    return () => {
        (window as any).Echo.leaveChannel('sefin-canal');
    };
    }, []);*/

    useEffect(() => {
    // Consulta al servidor cada 20 segundos
    const intervalo = setInterval(() => {
        if (!document.hidden) {
            router.reload({
                only: ['documentos'],
            });
        }
    }, 20000); // 20000 ms = 20 segundos

    return () => clearInterval(intervalo);
}, []);



    // Disparador unificado de filtros en tiempo real por GET
    const ejecutarFiltrado = (cambios: Record<string, string>) => {
        const params = {
            rfc: cambios.rfc !== undefined ? cambios.rfc : rfc,
            area_id: cambios.area_id !== undefined ? cambios.area_id : areaId,
            estatus: cambios.estatus !== undefined ? cambios.estatus : estatus,
            ciac: cambios.ciac !== undefined ? cambios.ciac : ciac,
            fecha: cambios.fecha !== undefined ? cambios.fecha : fecha,
            user_id:
                cambios.user_id !== undefined ? cambios.user_id : filtroUserId,
        };
        router.get(route("documentos.cargar"), params, {
            preserveState: true,
            replace: true,
        });
    };

    const limpiarTodo = () => {
        setRfc("");
        setAreaId("");
        setEstatus("");
        setCiac("");
        setFecha("");
        setFiltroUserId("");
        router.get(route("documentos.cargar"), {}, { replace: true });
    };

    // Formulario de asignación masiva en bloque (Inertia useForm)
    const formAsignar = useForm({
        documento_ids: [] as number[],
        user_id: "",
    });

    // Funciones para controlar los Checkboxes
    const toggleSeleccion = (id: number) => {
        setSeleccionados((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id],
        );
    };

    const toggleTodos = () => {
        if (seleccionados.length === documentos.data.length) {
            setSeleccionados([]);
        } else {
            setSeleccionados(documentos.data.map((d) => d.id));
        }
    };

    const handleAsignarMasivo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formAsignar.data.user_id) {
            toast.error("Por favor, selecciona a un notificador de la lista.");
            return;
        }

        router.post(
            route("documentos.asignarMasivo"),
            {
                documento_ids: seleccionados,
                user_id: formAsignar.data.user_id,
            },
            {
                onSuccess: () => {
                    toast.success(
                        `🎉 Lote de ${seleccionados.length} documentos asignado con éxito.`,
                    );
                    setSeleccionados([]);
                    formAsignar.reset();
                },
            },
        );
    };

    const onSubmitMasivo = (e: React.FormEvent) => {
        e.preventDefault();
        formMasivo.post(route("documentos.cargarMasivo"), {
            forceFormData: true,
            onSuccess: () => {
                toast.success("Archivo masivo insertado con éxito.");
                setModalExcel(false);
                formMasivo.reset();
            },
        });
    };

    const abrirModalEdicion = (doc: any) => {
        setEditId(doc.id);
        // Rellenamos el formulario individual con los datos reales del oficio seleccionado
        formIndividual.setData({
            numero_control: doc.numero_control,
            numero_oficio: doc.numero_oficio,
            ciac_id: doc.ciac_id.toString(),
            rfc_contribuyente: doc.rfc_contribuyente,
            razon_social_contribuyente: doc.razon_social_contribuyente,
            domicilio_contribuyente: doc.domicilio_contribuyente,
            referencias_domicilio: doc.referencias_domicilio || '',
            fecha_documento: doc.fecha_documento,
            area_id: doc.area_id.toString(),
            tipo_documento_id: doc.tipo_documento_id.toString(),
            user_id: doc.user_id ? doc.user_id.toString() : "",
        });
        setModalIndividual(true);
    };

    const onSubmitIndividual = (e: React.FormEvent) => {
        e.preventDefault();

        if (editId) {
            // SI ESTAMOS EDITANDO: Enviamos un PUT hacia el Back de forma asíncrona
            router.put(`/documentos/${editId}`, formIndividual.data, {
                onSuccess: () => {
                    toast.success("Registro modificado correctamente.");
                    setModalIndividual(false);
                    setEditId(null);
                    formIndividual.reset();
                },
            });
        } else {
            // SI ES NUEVO: Flujo tradicional por POST
            formIndividual.post(route("documentos.store"), {
                onSuccess: () => {
                    toast.success("Registro individual guardado.");
                    setModalIndividual(false);
                    formIndividual.reset();
                },
            });
        }
    };

    const handleEliminar = (id: number) => {
        if (
            confirm(
                "¿Estás seguro de que deseas eliminar este documento? Esta acción borrará permanentemente su bitácora en cascada.",
            )
        ) {
            router.delete(`/documentos/${id}`, {
                onSuccess: () =>
                    toast.success("Documento eliminado de forma segura."),
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold leading-tight text-gray-800 dark:text-gray-200">
                        Inventario de Documentos de Notificación
                    </h2>
                    <div className="flex gap-2">
                        {(roleUsuario === 'coordinador_ciac' || roleUsuario === 'administrador') ? (
                        <button
                            onClick={() => setModalExcel(true)}
                            className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900/60 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm"
                        >
                            <svg
                                className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                xmlns="http://w3.org"
                            >
                                <path
                                    d="M3 5v14c0 1.1.9 2 2 2h4V3H5c-1.1 0-2 .9-2 2z"
                                    fill="currentColor"
                                    fillOpacity="0.1"
                                />
                                <path d="M13 8l6 8" />
                                <path d="M19 8l-6 8" />
                                <path d="M9 3h10c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H9" />
                            </svg>
                            Cargar Excel
                        </button>
                        ):null}

                    {(roleUsuario === 'coordinador_ciac' || roleUsuario === 'administrador') ? (

                        <button
                            onClick={() => setModalIndividual(true)}
                            className="inline-flex items-center gap-2 bg-[#9D2449]/5 hover:bg-[#9D2449]/10 text-[#9D2449] dark:text-[#c63660] border border-[#9D2449]/20 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm"
                        >
                            <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                />
                            </svg>
                            Registro Manual
                        </button>
                    ) : null}
                    </div>
                </div>
            }
        >
            <Head title="Inventario Central" />

            <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={rfc}
                            onChange={(e) => {
                                setRfc(e.target.value);
                                ejecutarFiltrado({ rfc: e.target.value });
                            }}
                            placeholder="🔍 Buscar por RFC del contribuyente (Ej: MAGR85...)"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#9D2449] focus:border-[#9D2449] shadow-sm font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-bold text-gray-500">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400">
                                Área de Origen
                            </label>
                            <select
                                value={areaId}
                                onChange={(e) => {
                                    setAreaId(e.target.value);
                                    ejecutarFiltrado({
                                        area_id: e.target.value,
                                    });
                                }}
                                className="p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Todas las áreas</option>
                                {areas?.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400">
                                Estatus Oficial
                            </label>
                            <select
                                value={estatus}
                                onChange={(e) => {
                                    setEstatus(e.target.value);
                                    ejecutarFiltrado({
                                        estatus: e.target.value,
                                    });
                                }}
                                className="p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Todos los estatus</option>
                                <option value="PENDIENTE POR NOTIFICAR">
                                    PENDIENTE POR NOTIFICAR
                                </option>
                                <option value="VISITADO">VISITADO</option>
                                <option value="NOTIFICADO">NOTIFICADO</option>
                                <option value="NO LOCALIZADO">
                                    NO LOCALIZADO
                                </option>
                                <option value="NO TRABAJADO">
                                    NO TRABAJADO
                                </option>
                            </select>
                        </div>

                        
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400">
                                CIAC Asignado
                            </label>
                            <select
                                value={ciac}
                                onChange={(e) => {
                                    setCiac(e.target.value);
                                    ejecutarFiltrado({
                                        ciac: e.target.value,
                                    });
                                }}
                                disabled={roleUsuario === 'coordinador_ciac'}
                                className="p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Todos los CIACs</option>
                                {ciacs?.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                    </option>
                                ))}
                            </select>
                        </div> 
                
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400">
                                Fecha del Documento
                            </label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={(e) => {
                                    setFecha(e.target.value);
                                    ejecutarFiltrado({ fecha: e.target.value });
                                }}
                                className="p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400">
                                Notificador Asignado
                            </label>
                            <select
                                value={filtroUserId}
                                onChange={(e) => {
                                    setFiltroUserId(e.target.value);
                                    ejecutarFiltrado({
                                        user_id: e.target.value,
                                    });
                                }}
                                className="p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-[#9D2449]"
                            >
                                <option value="">
                                    Todos los notificadores
                                </option>
                                {notificadores.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {(rfc ||
                        areaId ||
                        estatus ||
                        ciac ||
                        fecha ||
                        filtroUserId) && (
                        <button
                            onClick={limpiarTodo}
                            className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                        >
                            Restablecer Filtros
                        </button>
                    )}
                </div>

                {/* HERRAMIENTA FLOTANTE DE ASIGNACIÓN MASIVA */}
                {seleccionados.length > 0 && (
                    <div className="bg-institucional-claro/50 border border-institucional-hover p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200">
                        <p className="text-xs font-semibold text-institucional-hover">
                            Has seleccionado{" "}
                            <strong className="text-institucional text-sm">
                                {seleccionados.length}
                            </strong>{" "}
                            documentos pendientes. Elige al notificador
                            responsable:
                        </p>
                        <form
                            onSubmit={handleAsignarMasivo}
                            className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
                        >
                            <select
                                value={formAsignar.data.user_id}
                                onChange={(e) =>
                                    formAsignar.setData(
                                        "user_id",
                                        e.target.value,
                                    )
                                }
                                className="p-2 text-xs border border-institucional-claro rounded-lg bg-white text-gray-900 focus:ring-institucional-claro w-full sm:w-56"
                                required
                            >
                                <option value="">
                                    Seleccionar notificador.
                                </option>
                                {notificadores.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                className="bg-institucional hover:bg-institucional-hover text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider transition shadow-sm"
                            >
                                Delegar Lote
                            </button>
                        </form>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                        <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-400 font-bold uppercase tracking-wider select-none">
                                    {/* COLUMNA BLOQUEADA IZQUIERDA: CHECKBOX MAESTRO */}
                                    <th className="p-4 w-12 text-center sticky left-0 z-20 bg-gray-50 dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-700/50">
                                        <input
                                            type="checkbox"
                                            checked={
                                                documentos.data.length > 0 &&
                                                seleccionados.length ===
                                                    documentos.data.length
                                            }
                                            disabled={
                                                roleUsuario === 'coordinador_area'
                                            }
                                            onChange={toggleTodos}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                                        />
                                    </th>

                                    {/* Columnas fluidas intermedias */}
                                    <th className="p-4">Num. Oficio/Control</th>
                                    <th className="p-4">Fecha documento</th>
                                    <th className="p-4">Contribuyente / RFC</th>
                                    <th className="p-4 min-w-[280px]">
                                        Domicilio Fiscal
                                    </th>
                                    <th className="p-4">Área / Tipo</th>
                                    <th className="p-4">CIAC</th>

                                    {/* COLUMNA BLOQUEADA DERECHA 1: NOTIFICADOR RESPONSABLE */}
                                    <th className="p-4 sticky right-[230px] z-20 bg-gray-50 dark:bg-gray-900 border-l border-gray-200/50 dark:border-gray-700/50">
                                        Notificador Responsable
                                    </th>

                                    {/* COLUMNA BLOQUEADA DERECHA 2: ESTATUS Y ACCIONES */}
                                    <th className="p-4 text-center w-[220px] sticky right-0 z-20 bg-gray-50 dark:bg-gray-900 border-l border-gray-200/50 dark:border-gray-700/50">
                                        Estatus / Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                                {documentos.data.length > 0 ? (
                                    documentos.data.map((d, index) => (
                                        
                                        <tr
                                            key={d.id}
                                            className={`transition-colors ${
        seleccionados.includes(d.id)
            ? "bg-institucional-claro/50 dark:bg-institucional-claro"
            :  roleUsuario === 'coordinador_area' && d.area_id === areaUsuario
                ? "bg-amber-50/80 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-900/30"
                : "hover:bg-gray-50/50 dark:hover:bg-gray-900/30"
    }`}
                                        >
                                            {/* CELDA FIJA IZQUIERDA: CHECKBOX INDIVIDUAL */}
                                            <td className="p-4 text-center sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-800">
                                                <input
                                                    type="checkbox"
                                                    checked={seleccionados.includes(
                                                        d.id,
                                                    )}

                                                    disabled={
                                                        roleUsuario === 'coordinador_area' && d.area_id !== areaUsuario
                                                    }
                                                    onChange={() =>
                                                        toggleSeleccion(d.id)
                                                    }
                                                    className="rounded border-gray-300 text-institucional hover:text-institucional-hover focus:ring-institucional h-4 w-4 cursor-pointer"
                                                />
                                            </td>

                                            {/* Celdas fluidas intermedias que se deslizan por debajo */}
                                            <td className="p-4">
                                                <strong className="block text-gray-400 font-normal">
                                                    {d.numero_oficio}
                                                </strong>{" "}
                                                <strong className="block text-gray-900 dark:text-white mt-0.5 font-mono">
                                                    {d.numero_control}
                                                </strong>
                                            </td>
                                            <td className="p-4 font-bold text-gray-900 dark:text-white">
                                                {d.fecha_documento}
                                            </td>
                                            <td className="p-4">
                                                <span className="font-bold text-gray-900 dark:text-white block">
                                                    {
                                                        d.razon_social_contribuyente
                                                    }
                                                </span>
                                                <span className="font-mono text-gray-400 text-[10px] uppercase mt-0.5 block">
                                                    {d.rfc_contribuyente}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-600 dark:text-gray-400 font-normal whitespace-normal min-w-[280px]">
                                                {d.domicilio_contribuyente}
                                            </td>
                                            <td className="p-4">
                                                <span>{d.area?.nombre}</span>
                                                <span className="text-[10px] text-gray-400 block mt-0.5 min-w-[280px]">
                                                    {d.tipo_documento?.nombre}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-gray-600 dark:text-gray-400">
                                                <span>{d.ciac?.nombre}</span>
                                            </td>

                                            {/* CELDA FIJA DERECHA 1: NOTIFICADOR (Coordinada con el ancho del estatus right-[90px]) */}
                                            <td className="p-4 sticky right-[230px] z-10 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-800">
                                                {d.user ? (
                                                    <span className="inline-flex items-center gap-1 font-semibold text-institucional-hover dark:text-institucional-hover bg-institucional-claro dark:bg-institucional-claro px-2 py-1 rounded">
                                                        {d.user.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-normal italic">
                                                        {" "}
                                                        Por asignar
                                                    </span>
                                                )}
                                            </td>

                                            {/* CELDA FIJA DERECHA 2: ESTATUS Y CONTROLES (Al extremo derecho right-0) */}
                                            <td className="p-4 sticky right-0 z-10 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-800 text-center">
                                                <div className="flex items-center justify-between gap-4">
                                                    {/* Estatus del Oficio */}
                                                    <span
                                                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                            d.estatus ===
                                                            "NOTIFICADO"
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : d.estatus ===
                                                                    "PENDIENTE POR NOTIFICAR"
                                                                  ? "bg-gray-100 text-gray-700"
                                                                  : d.estatus ===
                                                                    "VISITADO"
                                                                  ? "bg-amber-50 text-amber-700"
                                                                  : "bg-red-50 text-red-700"
                                                        }`}
                                                    >
                                                        {d.estatus}
                                                    </span>

                                                    {/* BOTONES DE ACCIÓN RÁPIDA */}
                                                    <div className="flex gap-1.5 font-bold">
                                                        <Link
                                                            href={`/documentos/${d.id}`}
                                                            title="Ver ficha técnica y línea de tiempo"
                                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-md transition-all duration-150"
                                                        >
                                                            <svg
                                                                className="h-5 w-5"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M2.036 12.322a1.012 1.012 0 010-.644M7.543 6.1a4.96 4.96 0 00-2.26 2.26m13.722 7.28a4.96 4.96 0 002.26-2.26M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                                                                />
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                                />
                                                            </svg>
                                                        </Link>

                                                    {((roleUsuario === 'coordinador_area' && d.area_id === areaUsuario) || 
      (roleUsuario === 'coordinador_ciac' && d.ciac_id === ciacUsuario)
      || roleUsuario === 'coordinador_area' ||
      roleUsuario === 'administrador') ? (
                                                        <button
                                                            onClick={() =>
                                                                abrirModalEdicion(
                                                                    d,
                                                                )
                                                            }
                                                            
                                                            title="Editar documento"
                                                            disabled={roleUsuario === 'coordinador_area' && d.area_id !== areaUsuario}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                                        >
                                                            <svg
                                                                className="h-5 w-5"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                                />
                                                            </svg>
                                                        </button>
      ) : null}

      {(roleUsuario === 'administrador' || roleUsuario === 'coordinador_ciac' || roleUsuario === 'coordinador_area') ? (

                                                        <button
                                                            onClick={() =>
                                                                handleEliminar(
                                                                    d.id,
                                                                )
                                                            }
                                                            title="Eliminar documento"
                                                            disabled={roleUsuario === 'coordinador_area'}
                                                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                                        >
                                                            <svg
                                                                className="h-5 w-5"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
      ):null}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="p-8 text-center text-gray-400 font-bold bg-gray-50 dark:bg-gray-900/20"
                                        >
                                            No se encontraron documentos con los
                                            filtros seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINADOR INSTITUTIONAL (Abajo de la tabla) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500">
                        <div>
                            Mostrando página{" "}
                            <span className="text-gray-900 dark:text-white font-black">
                                {documentos.current_page}
                            </span>{" "}
                            de un total de{" "}
                            <span className="text-[#9D2449] font-black">
                                {documentos.total}
                            </span>{" "}
                            oficios registrados.
                        </div>

                        <div className="flex flex-wrap gap-1">
                            {documentos.links.map((link, i) => {
                                // Limpiamos los textos de las flechas que Laravel manda por defecto
                                let textoBoton = link.label;
                                if (textoBoton.includes("Previous"))
                                    textoBoton = "←";
                                if (textoBoton.includes("Next"))
                                    textoBoton = "→";

                                if (link.url === null) {
                                    // Botón deshabilitado
                                    return (
                                        <span
                                            key={i}
                                            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600 rounded-lg border border-gray-100 dark:border-gray-800 cursor-not-allowed select-none"
                                        >
                                            {textoBoton}
                                        </span>
                                    );
                                }

                                return (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        preserveScroll
                                        preserveState
                                        className={`px-3 py-2 rounded-lg border transition-all duration-150 ${
                                            link.active
                                                ? "bg-[#9D2449] text-white border-[#9D2449] shadow-sm"
                                                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                                        }`}
                                    >
                                        {textoBoton}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {modalExcel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900">
                                Carga Masiva (Excel o CSV)
                            </h3>
                            <form
                                onSubmit={onSubmitMasivo}
                                className="mt-4 space-y-4"
                            >
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={(e) =>
                                        formMasivo.setData(
                                            "archivo_excel",
                                            e.target.files &&
                                                e.target.files.length > 0
                                                ? e.target.files[0]
                                                : null,
                                        )
                                    }
                                    className="block w-full text-xs text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#9D2449] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                                />
                                <div className="flex gap-3">
                                    {formMasivo.errors.archivo_excel && (
    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-bold">
        <p className="uppercase tracking-wider flex items-center gap-1">
            <span>⚠️ Error en la estructura del Excel:</span>
        </p>
        <p className="font-normal mt-1 text-gray-700 dark:text-gray-300">
            {formMasivo.errors.archivo_excel}
        </p>
    </div>
)}
                                    <button
                                        type="button"
                                        onClick={() => setModalExcel(false)}
                                        className="w-1/2 bg-gray-100 text-gray-700 text-xs font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-1/2 bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                                        disabled={formMasivo.processing}
                                    >
                                        {formMasivo.processing
                                            ? "Subiendo..."
                                            : "Importar"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modalIndividual && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900">
                                Captura Manual Individual
                            </h3>
                            <form
                                onSubmit={onSubmitIndividual}
                                className="mt-4 space-y-3"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="block text-xs font-bold text-gray-600">
                                        Número de Control
                                        <input
                                            type="text"
                                            value={
                                                formIndividual.data
                                                    .numero_control
                                            }
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "numero_control",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            required
                                        />
                                    </label>

                                    <label className="block text-xs font-bold text-gray-600">
                                        Número de Oficio
                                        <input
                                            type="text"
                                            value={
                                                formIndividual.data
                                                    .numero_oficio
                                            }
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "numero_oficio",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            
                                        />
                                    </label>

                                    <label className="block text-xs font-bold text-gray-600">
                                        RFC Contribuyente *
                                        <input
                                            type="text"
                                            maxLength={13}
                                            value={
                                                formIndividual.data
                                                    .rfc_contribuyente
                                            }
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "rfc_contribuyente",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 uppercase dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            
                                        />
                                    </label>

                                    <label className="block text-xs font-bold text-gray-600">
                                        Razón Social *
                                        <input
                                            type="text"
                                            value={
                                                formIndividual.data
                                                    .razon_social_contribuyente
                                            }
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "razon_social_contribuyente",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            required
                                        />
                                    </label>

                                    <label className="block text-xs font-bold text-gray-600 md:col-span-2">
                                        Domicilio Fiscal *
                                        <input
                                            type="text"
                                            value={
                                                formIndividual.data
                                                    .domicilio_contribuyente
                                            }
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "domicilio_contribuyente",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            required
                                        />
                                    </label>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-gray-600">Referencias de Ubicación / Domicilio</label>
                                            <textarea 
                                                value={formIndividual.data.referencias_domicilio} 
                                                onChange={e => formIndividual.setData('referencias_domicilio', e.target.value)}
                                                placeholder="Ej: Frente al parque central, portón color café con protecciones negras..."
                                                className="w-full p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white font-normal"
                                                rows={2}
                                            />
                                    </div>

                                    <div>

                                    <label className="block text-xs font-bold text-gray-600">
                                        CIAC*
                                        <select
                                            value={formIndividual.data.ciac_id}
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "ciac_id",
                                                    e.target.value,
                                                )
                                            }
                                            disabled={roleUsuario === 'coordinador_ciac'}
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            required
                                        >
                                            <option value="">
                                                Selecciona el CIAC
                                            </option>
                                            {ciacs.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
    </div>


                                    <label className="block text-xs font-bold text-gray-600">
                                        Fecha del Documento *
                                        <input
                                            type="date"
                                            value={
                                                formIndividual.data
                                                    .fecha_documento
                                            }
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "fecha_documento",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            required
                                        />
                                    </label>

                                    <label className="block text-xs font-bold text-gray-600">
                                        Área de Origen *
                                        <select
                                            value={formIndividual.data.area_id}
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "area_id",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            required
                                        >
                                            <option value="">
                                                Selecciona el Área
                                            </option>
                                            {areas.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block text-xs font-bold text-gray-600">
                                        Tipo de Documento *
                                        <select
                                            value={
                                                formIndividual.data
                                                    .tipo_documento_id
                                            }
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "tipo_documento_id",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-[#9D2449]"
                                            required
                                        >
                                            <option value="">
                                                Selecciona el Tipo
                                            </option>
                                            {tiposDocumento.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block text-xs font-bold text-gray-600">
                                        Asignar Notificador (Opcional)
                                        <select
                                            value={formIndividual.data.user_id}
                                            onChange={(e) =>
                                                formIndividual.setData(
                                                    "user_id",
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full p-2 border border-purple-300 rounded-lg text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-purple-500"
                                        >
                                            <option value="">
                                                Sin asignar
                                            </option>
                                            {notificadores.map((n) => (
                                                <option key={n.id} value={n.id}>
                                                    {n.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                {formIndividual.errors.numero_control && (
                                    <div className="text-red-500 text-xs">
                                        {formIndividual.errors.numero_control}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModalIndividual(false)
                                        }
                                        className="w-1/2 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-1/2 bg-[#9D2449] text-white py-2.5 rounded-lg font-bold hover:bg-[#7a1b38] transition-colors disabled:opacity-60"
                                        disabled={formIndividual.processing}
                                    >
                                        {formIndividual.processing
                                            ? "Guardando..."
                                            : "Guardar"}
                                    </button>

                                    {Object.keys(formIndividual.errors).length > 0 && (
    <div className="sm:col-span-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 p-3 rounded-xl text-[11px] text-rose-700 dark:text-rose-400 font-bold space-y-1">
        <p className="uppercase tracking-wider">⚠️ Errores de validación del servidor:</p>
        <ul className="list-disc list-inside font-normal">
            {Object.entries(formIndividual.errors).map(([campo, mensaje]) => (
                <li key={campo} className="capitalize">
                    <strong>{campo.replace('_', ' ')}:</strong> {mensaje}
                </li>
            ))}
        </ul>
    </div>
)}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <Toaster position="top-right" />
        </AuthenticatedLayout>
    );
}
