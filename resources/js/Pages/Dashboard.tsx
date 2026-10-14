import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

interface Props {
    totales: {
        por_asignar: number;
        notificados: number;
        no_localizados: number;
        no_trabajados: number;
    };
}

export default function Dashboard({ totales }: Props) {
    // 1. Extraemos los datos del usuario logueado desde las props globales de Inertia
    const { auth } = usePage().props as any;
    const usuarioLogueado = auth.user; // Contiene: name, email, role

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-institucional dark:text-gray-200">
                    Panel Institucional
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-0 lg:px-8 space-y-6">
                    
                    {/* SECCIÓN DE BIENVENIDA */}
                    <div className="overflow-hidden bg-white shadow-sm dark:bg-gray-800 sm:rounded-lg p-6 border-l-4 border-institucional">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            🇲🇽 ¡Bienvenido al Sistema de Gestión Interna!
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Plataforma oficial para el control, registro y seguimiento de actas y citatorios. Utiliza los módulos autorizados bajo tu cargo actual como <span className="font-semibold text-institucional dark:text-institucional uppercase">{usuarioLogueado.role}</span>.
                        </p>
                    </div>

                    {/* 📊 INDICADORES CLAVE (KPIs) BASADOS EN EL ESTATUS DEL EXCEL */}
                <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Estatus Global del Turno Actual
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-gray-400">
                            <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">Por Notificar</span>
                            <span className="text-2xl font-black text-gray-700 dark:text-gray-300">{totales?.por_asignar ?? 0}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-emerald-500">
                            <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">Notificados</span>
                            <span className="text-2xl font-black text-emerald-600">{totales?.notificados ?? 0}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-amber-500">
                            <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">No Localizados</span>
                            <span className="text-2xl font-black text-amber-600">{totales?.no_localizados ?? 0}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-rose-500">
                            <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">No Trabajados</span>
                            <span className="text-2xl font-black text-rose-600">{totales?.no_trabajados ?? 0}</span>
                        </div>
                    </div>
                </div>

                    {/* GRILLA DE ACCESOS RÁPIDOS (Se adapta automáticamente a 1 o 2 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* BOTÓN 1: MÓDULO DE NOTIFICACIONES (Visible para todos) */}
                        <Link 
                            href={route('documentos.cargar')} 
                            className="group block overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
                        >
                           <div className="relative h-48 bg-gradient-to-r from-institucional to-stone-800 overflow-hidden flex items-center justify-center text-white">
                               
                                <div className="relative text-center p-4">
                                    <span className="text-4xl">📋</span>
                                    <h3 className="text-xl font-bold mt-2">Módulo de Notificaciones</h3>
                                    <p className="text-xs text-blue-100 mt-1">Acceso al historial, geoposicionamiento y captura de oficios</p>
                                </div>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-institucional transition-colors">
                                    Ingresar al panel de control
                                </span>
                                <span className="text-institucional group-hover:translate-x-1 transition-transform font-bold">→</span>
                            </div>
                        </Link>

                        {/* BOTÓN 2: ADMINISTRAR PERSONAL (Exclusivo para el Administrador) */}
                        {usuarioLogueado.role === 'administrador' && (
                        
                            <Link 
                                href={route('usuarios.index')} 
                                className="group block overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700 "
                            >
                                
                            
                                <div className="relative h-48 bg-gradient-to-r from-institucional-hover to-stone-800 overflow-hidden flex items-center justify-center text-white">
                                    
                                   
                                    <div className="relative text-center p-4">
                                        <span className="text-4xl">🛡️</span>
                                        <h3 className="text-xl font-bold mt-2">Administrar Personal</h3>
                                        <p className="text-xs text-purple-100 mt-1">Alta de notificadores, control de accesos y reajuste de claves</p>
                                    </div>
                                </div>
                                <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-institucional-hover transition-colors">
                                        Gestionar plantilla de funcionarios
                                    </span>
                                    <span className="text-institucional-hover group-hover:translate-x-1 transition-transform font-bold">→</span>
                                </div>
                            </Link>


                        )}

                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}