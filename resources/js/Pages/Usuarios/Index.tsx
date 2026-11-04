import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface Usuario {
    id: number;
    name: string;
    email: string;
    role: string;
    activo: boolean;
    area_id?: number | null;
    ciac_id?: number | null;
}

interface Area {
    id: number;
    nombre: string;
}

interface Ciac {
    id: number;
    nombre: string;
}

interface Props {
    usuarios: Usuario[];
    areas: Area[];
    ciacs: Ciac[];
}

export default function Index({ usuarios,areas,ciacs }: Props) {
    const [editId, setEditId] = useState<number | null>(null);

    const { data, setData, post, put, delete: destroy, errors, reset, transform, processing } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'notificador',
        activo: true,
        area_id: '',
        ciac_id: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
        // En Inertia v2, put solo lleva la URL y las opciones (onSuccess, etc.)
        // No necesita la propiedad 'data' porque toma el estado del formulario en automático
        put(`/usuarios/${editId}`, {
            onSuccess: () => {
                toast.success('Usuario y credenciales actualizados con éxito');
                setEditId(null);
                reset();
            }
        });
    } else {
        post('/usuarios', {
            onSuccess: () => {
                toast.success('Nuevo usuario registrado');
                reset();
            }
        });
    }
};

    const handleEdit = (user: Usuario) => {
        setEditId(user.id);
        setData({
            name: user.name,
            email: user.email,
            password: '', // Se deja vacío, solo se llena si se quiere cambiar
            role: user.role,
            activo: user.activo,
            area_id: user.area_id ? user.area_id.toString() : '',
            ciac_id: user.ciac_id ? user.ciac_id.toString() : ''
        });
    };

    const toggleBloqueo = (user: Usuario) => {
        const nuevoEstado = !user.activo;
    
        if (confirm(`¿Seguro que deseas ${nuevoEstado ? 'ACTIVAR' : 'BLOQUEAR'} a este usuario?`)) {
            // Usamos el método nativo transform del useForm para alterar los datos justo antes del envío
            transform((dataActual: any) => ({
                ...dataActual,
                name: user.name,
                email: user.email,
                role: user.role,
                area_id: user.area_id ? user.area_id.toString() : '',
                ciac_id: user.ciac_id ? user.ciac_id.toString() : '',
                activo: nuevoEstado, // Inyectamos el nuevo estado booleano
                password: ''         // Mandamos la clave vacía para mantener la actual
            }));

            // Ejecutamos el PUT pasando únicamente la URL (Justo lo que TypeScript espera, 1 solo argumento)
            put(`/usuarios/${user.id}`, {
                onSuccess: () => toast.success(nuevoEstado ? 'Usuario activado' : 'Usuario bloqueado 🔒')
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('¿Seguro que deseas ELIMINAR permanentemente a este usuario? Se borrará todo su historial.')) {
            destroy(`/usuarios/${id}`, {
                onSuccess: () => toast.error('Usuario eliminado del sistema.')
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-institucional dark:text-gray-200">Control de Personal Gubernamental</h2>}
        >
            <Head title="Administración de Personal" />
            <div className="py-12 mx-auto max-w-7xl sm:px-0 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* FORMULARIO DE CAPTURA */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 h-fit">
                        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">{editId ? '📝 Modificar Usuario' : '➕ Registrar Nuevo Usuario'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 text-gray-900 dark:text-white" />
                                {errors.name && <span className="text-red-500 text-xs">{errors.name}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                                <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 text-gray-900 dark:text-white" />
                                {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {editId ? 'Contraseña (Dejar en blanco para mantener actual)' : 'Contraseña Inicial'}
                                </label>
                                <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 text-gray-900 dark:text-white" />
                                {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol Institucional</label>
                                <select value={data.role} onChange={e => setData('role', e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="notificador">Notificador de campo</option>
                                        <option value="administrador">Administrador del sistema</option>
                                        <option value="coordinador_area">Coordinador de Área</option>
                                        <option value="coordinador_ciac">Coordinador CIAC</option>
                                </select>
                            </div>

                            {data.role === 'coordinador_area' && (
                                 <div className="animate-in slide-in-from-top-2 duration-200">
        <label className="block text-amber-700 dark:text-amber-400 font-bold mb-1">
            Asignar Área de Origen *
        </label>
        <select
            value={data.area_id}
            onChange={e => setData('area_id', e.target.value)}
            className="w-full p-2.5 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 rounded-xl text-gray-900 dark:text-white text-xs font-bold"
            required
        >
            <option value="">— Selecciona el Área correspondiente —</option>
            {areas.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
        </select>
    </div>

                            )}

                            {data.role === 'coordinador_ciac' && (
                                 <div className="animate-in slide-in-from-top-2 duration-200">
        <label className="block text-amber-700 dark:text-amber-400 font-bold mb-1">
            Asignar CIAC de Origen *
        </label>
        <select
            value={data.ciac_id}
            onChange={e => setData('ciac_id', e.target.value)}
            className="w-full p-2.5 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 rounded-xl text-gray-900 dark:text-white text-xs font-bold"
            required
        >
            <option value="">— Selecciona el CIAC correspondiente —</option>
            {ciacs.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
        </select>
    </div>

                            )}

                            {/* 🚨 DETECTOR DE ERRORES OCULTOS EN EL MODAL DE USUARIOS */}
{errors && Object.keys(errors).length > 0 && (
    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 p-3 rounded-xl text-[11px] text-rose-700 dark:text-rose-400 font-bold space-y-1">
        <p className="uppercase tracking-wider">⚠️ Errores de validación del personal:</p>
        <ul className="list-disc list-inside font-normal">
            {Object.entries(errors).map(([campo, mensaje]) => (
                <li key={campo} className="capitalize">
                    <strong>{campo.replace('_', ' ')}:</strong> {mensaje}
                </li>
            ))}
        </ul>
    </div>
)}

                            

                            


                            <button
    type="submit"
    // Deshabilitamos el botón mientras Laravel escribe en PostgreSQL para evitar duplicados
    disabled={processing}
    className={`w-full relative group overflow-hidden p-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-all duration-300 transform border border-black/10 flex items-center justify-center gap-3 ${
        processing 
            ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed shadow-none' 
            : 'bg-gradient-to-r from-[#9D2449] to-[#801a37] text-white hover:from-[#801a37] hover:to-[#631127] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
    }`}
>
    {/* ⚡ EFECTO VISUAL: Destello de luz que cruza el botón al pasar el cursor (Solo si no está procesando) */}
    {!processing && (
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] z-0" />
    )}

    {/* RETROALIMENTACIÓN INTERACTIVA DINÁMICA */}
    {processing ? (
        // ⏳ Spinner animado cuando Laravel procesa la encriptación Hash del nuevo usuario
        <div className="relative z-10 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://w3.org">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-mono">Inscribiendo Cuenta...</span>
        </div>
    ) : (
        // 🛡️ Icono vectorial de usuario con escudo de seguridad (Alineado a Recursos Humanos / Admin)
        <>
            <div className="relative z-10 bg-white/10 p-1 rounded-md border border-white/10 group-hover:scale-110 transition-transform duration-200">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                    {/* Silueta de Usuario */}
                    <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    {/* Base del usuario / Escudo */}
                    <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                {editId ? 'Confirmar Modificación' : 'Dar de Alta Nuevo Usuario'}
            </span>
        </>
    )}
</button>




                            {editId && (
                                <button type="button" onClick={() => { setEditId(null); reset(); }} className="w-full bg-gray-400 text-white p-2.5 rounded-md mt-2">Cancelar</button>
                            )}
                        </form>

                    </div>

                    {/* TABLA DE USUARIOS */}
                    <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">Usuarios</h3>
                        <div className="space-y-4">
                            {usuarios.map(u => (
                                <div key={u.id} className={`p-4 border rounded-xl flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 ${!u.activo ? 'border-red-300 opacity-75 bg-red-50/50' : 'dark:border-gray-700'}`}>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                            {u.name}
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${u.role === 'administrador' || u.role === 'coordinador_ciac' || u.role === 'coordinador_area' ? 'bg-purple-100 text-institucional' : 'bg-institucional-claro text-institucional-hover'}`}>
                                                {u.role.toUpperCase()}
                                            </span>
                                            {u.ciac_id && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${u.role === 'administrador'  || u.role === 'coordinador_ciac' || u.role === 'coordinador_area' ? 'bg-purple-100 text-institucional' : 'bg-institucional-claro text-institucional-hover'}`}>
                                                    {ciacs.find(c => c.id === u.ciac_id)?.nombre}
                                                </span>
                                            )}

                                            {u.area_id && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${u.role === 'administrador' || u.role === 'coordinador_area' || u.role === 'coordinador_ciac' ? 'bg-purple-100 text-institucional' : 'bg-institucional-claro text-institucional-hover'}`}>
                                                    {areas.find(a => a.id === u.area_id)?.nombre}
                                                </span>
                                            )}

                                            {!u.activo && <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-100 text-red-800">🔒 BLOQUEADO</span>}
                                        </h4>
                                        <p className="text-xs text-gray-500">{u.email}</p>
                                    </div>
                                    <div className="flex gap-3 text-xs font-semibold">
                                        <button onClick={() => handleEdit(u)} className="text-blue-500 hover:underline">Editar/Contraseña</button>
                                        <button onClick={() => toggleBloqueo(u)} className={u.activo ? 'text-amber-600 hover:underline' : 'text-emerald-600 hover:underline'}>
                                            {u.activo ? 'Bloquear' : 'Desbloquear'}
                                        </button>
                                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:underline">Eliminar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            <Toaster />
        </AuthenticatedLayout>
    );
}
