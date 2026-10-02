import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { FormEventHandler } from 'react';

export default function Login() {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row antialiased">
            <Head title="Iniciar Sesión" />

            {/* 🏛️ PANEL INSTITUCIONAL CENTRADO: Ahora visible en móviles como Banner Superior */}
            {/* md:w-1/2 min-h-screen para PC | w-full h-48 para celulares */}
            <div className="w-full md:w-1/2 h-48 md:min-h-screen relative bg-stone-950 overflow-hidden flex items-center justify-center p-6 md:p-12 shrink-0">
                
                {/* La imagen oficial de tu carpeta public */}
                <img 
                    src="/imagen-login.jpg" 
                    alt="Fotografía Oficial de la Institución" 
                    className="absolute inset-0 w-full h-full object-cover z-0"
                />
                
                {/* El degradado guinda oficial que asegura el contraste de las letras blancas */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#9D2449]/95 via-[#9D2449]/80 to-stone-950/70 z-10" />

                {/* Contenido centrado: Se autoajusta el tamaño del texto y espacios en celular */}
                <div className="relative z-20 max-w-md text-center space-y-3 md:space-y-6 text-white flex flex-col items-center">
                    
                    {/* Logotipo: Más pequeño en móvil (h-10) y tamaño normal en PC (md:h-16) */}
                    <div className="bg-white/10 backdrop-blur-md inline-block p-2 md:p-4 rounded-xl md:rounded-2xl border border-white/20 shadow-2xl">
                        <ApplicationLogo className="h-10 md:h-16 w-auto brightness-0 invert" />
                    </div>
                    
                    <div className="space-y-1">
                        <h1 className="text-xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight drop-shadow-md">
                            Sistema de Notificaciones
                        </h1>
                        <p className="text-[11px] md:text-sm text-white/90 font-medium max-w-xs md:max-w-none leading-relaxed drop-shadow-sm">
                            Plataforma oficial para el control y seguimiento de actas de notificaciones y citatorios.
                        </p>
                    </div>
                    
                    {/* Metadatos inferiores: Visibles solo en PC para mantener el celular limpio */}
                    <div className="hidden md:flex pt-6 border-t border-white/20 w-full items-center justify-center gap-3 text-[10px] text-white/60 font-mono">
                        <span>Versión 1.0.0</span>
                    </div>
                </div>
            </div>

            {/* COLUMNA DEL FORMULARIO DE ACCESO */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:w-1/2 bg-white dark:bg-gray-900">
                <div className="w-full max-w-md space-y-6 md:space-y-8">
                    
                    <div className="space-y-1.5 text-center md:text-left">
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                            Ingreso al Sistema
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Digita tus credenciales institucionales autorizadas por el Administrador.
                        </p>
                    </div>

                    {/* FORMULARIO DE CAPTURA */}
                    <form onSubmit={submit} className="space-y-5">
                        
                        {/* INPUT: CORREO ELECTRÓNICO */}
                        <div className="space-y-1">
                            <label htmlFor="email" className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Correo Institucional
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-[#9D2449] focus:ring-[#9D2449] text-sm p-3 transition-colors"
                                placeholder="ejemplo@gob.mx"
                                required
                            />
                            {errors.email && <span className="text-rose-600 text-xs font-medium block mt-1">{errors.email}</span>}
                        </div>

                        {/* INPUT: CONTRASEÑA */}
                        <div className="space-y-1">
                            <label htmlFor="password" className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Contraseña de Acceso
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-[#9D2449] focus:ring-[#9D2449] text-sm p-3 transition-colors"
                                placeholder="••••••••"
                                required
                            />
                            {errors.password && <span className="text-rose-600 text-xs font-medium block mt-1">{errors.password}</span>}
                        </div>

                        {/* RECORDAR SESIÓN */}
                        <div className="flex items-center justify-between text-xs font-medium">
                            <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-700 text-[#9D2449] focus:ring-[#9D2449]/40 h-4 w-4 bg-gray-50 dark:bg-gray-800"
                                />
                                Mantener sesión abierta en este equipo
                            </label>
                        </div>

                        {/* BOTÓN DE ACCESO */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full bg-[#9D2449] hover:bg-[#7a1b38] text-white p-3 rounded-lg font-bold text-sm transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://w3.org">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Validando Credenciales...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                    {/* PIE DE PÁGINA */}
                    <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
                        Aviso: El uso no autorizado de este sistema informático está estrictamente prohibido y sujeto a sanciones legales.
                    </div>

                </div>
            </div>
        </div>
    );
}
