import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface Props {
    areas: Array<{ id: number; nombre: string }>;
    tiposDocumento: Array<{ id: number; nombre: string }>;
}

export default function Index({ areas, tiposDocumento }: Props) {
    const [editAreaId, setEditAreaId] = useState<number | null>(null);
    const [editTipoId, setEditTipoId] = useState<number | null>(null);

    const formArea = useForm({ nombre: '' });
    const formTipo = useForm({ nombre: '' });

    // --- ACCIONES DE ÁREAS ---
    const onSubmitArea = (e: React.FormEvent) => {
        e.preventDefault();
        if (editAreaId) {
            router.put(`/areas/${editAreaId}`, formArea.data, {
                onSuccess: () => { toast.success('Área actualizada'); setEditAreaId(null); formArea.reset(); }
            });
        } else {
            formArea.post(route('areas.store'), {
                onSuccess: () => { toast.success('Nueva área registrada'); formArea.reset(); }
            });
        }
    };

    const encederEdicionArea = (area: any) => {
        setEditAreaId(area.id);
        formArea.setData('nombre', area.nombre);
    };

    const handleEliminarArea = (id: number) => {
        if (confirm('¿Deseas eliminar esta área del catálogo oficial?')) {
            router.delete(`/areas/${id}`, {
                onError: (err: any) => toast.error(err.error || 'Error al eliminar'),
                onSuccess: () => toast.success('Área removida')
            });
        }
    };

    // --- ACCIONES DE TIPOS DE DOCUMENTO ---
    const onSubmitTipo = (e: React.FormEvent) => {
        e.preventDefault();
        if (editTipoId) {
            router.put(`/tipo-documentos/${editTipoId}`, formTipo.data, {
                onSuccess: () => { toast.success('Tipo de documento actualizado'); setEditTipoId(null); formTipo.reset(); }
            });
        } else {
            formTipo.post(route('tipoDocumentos.store'), {
                onSuccess: () => { toast.success('Tipo de documento añadido'); formTipo.reset(); }
            });
        }
    };

    const encederEdicionTipo = (tipo: any) => {
        setEditTipoId(tipo.id);
        formTipo.setData('nombre', tipo.nombre);
    };

    const handleEliminarTipo = (id: number) => {
        if (confirm('¿Deseas eliminar este tipo de documento?')) {
            router.delete(`/tipo-documentos/${id}`, {
                onError: (err: any) => toast.error(err.error || 'Error al eliminar'),
                onSuccess: () => toast.success('Tipo removido')
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-bold leading-tight text-gray-800 dark:text-gray-200">Configuración de Catálogos Oficiales</h2>}
        >
            <Head title="Administrar Catálogos" />
            
            <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                    
                    {/* SECCIÓN A: CRUD DE ÁREAS */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Áreas de origen</h3>
                        
                        <form onSubmit={onSubmitArea} className="flex gap-2">
                            <input 
                                type="text" value={formArea.data.nombre} onChange={e => formArea.setData('nombre', e.target.value)}
                                placeholder="Ej: DIRECCIÓN DE LO CONTENCIOSO" required
                                className="flex-1 p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-[#9D2449]"
                            />
                            <button type="submit" disabled={formArea.processing} className="bg-[#9D2449] text-white px-4 py-2 rounded-lg font-bold uppercase">
                                {editAreaId ? 'Modificar' : 'Agregar'}
                            </button>
                            {editAreaId && <button type="button" onClick={() => { setEditAreaId(null); formArea.reset(); }} className="bg-gray-100 px-3 py-2 rounded-lg font-bold">✕</button>}
                        </form>

                        <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                                    {areas.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                            <td className="p-3 font-semibold text-gray-900 dark:text-white">{a.nombre}</td>
                                            <td className="p-3 text-right space-x-2 font-bold shrink-0">
                                                <button onClick={() => encederEdicionArea(a)} className="text-blue-600 hover:underline">Editar</button>
                                                <button onClick={() => handleEliminarArea(a.id)} className="text-rose-600 hover:underline">Borrar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SECCIÓN B: CRUD DE TIPOS DE DOCUMENTOS */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Tipos de Documento</h3>
                        
                        <form onSubmit={onSubmitTipo} className="flex gap-2">
                            <input 
                                type="text" value={formTipo.data.nombre} onChange={e => formTipo.setData('nombre', e.target.value)}
                                placeholder="Ej: REQUERIMIENTOS ESTATALES" required
                                className="flex-1 p-2 border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-[#9D2449]"
                            />
                            <button type="submit" disabled={formTipo.processing} className="bg-[#9D2449] text-white px-4 py-2 rounded-lg font-bold uppercase">
                                {editTipoId ? 'Modificar' : 'Agregar'}
                            </button>
                            {editTipoId && <button type="button" onClick={() => { setEditTipoId(null); formTipo.reset(); }} className="bg-gray-100 px-3 py-2 rounded-lg font-bold">✕</button>}
                        </form>

                        <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                                    {tiposDocumento.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                            <td className="p-3 font-semibold text-gray-900 dark:text-white">{t.nombre}</td>
                                            <td className="p-3 text-right space-x-2 font-bold-shrink-0">
                                                <button onClick={() => encederEdicionTipo(t)} className="text-blue-600 hover:underline">Editar</button>
                                                <button onClick={() => handleEliminarTipo(t.id)} className="text-rose-600 hover:underline">Borrar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
            <Toaster />
        </AuthenticatedLayout>
    );
}
