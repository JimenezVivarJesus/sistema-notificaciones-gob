import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import React, { PropsWithChildren, ReactNode, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import axios from 'axios';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;
    
    const { auth } = usePage().props as any;
    const usuarioLogueado = auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let regSub: any = null;
        let notifSub: any = null;

        const registrarPush = async () => {
            try {
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive === 'granted') {
                    await PushNotifications.register();
                }
            } catch (error) {
                console.error('Error al inicializar notificaciones push en dispositivo:', error);
            }
        };

        PushNotifications.addListener('registration', (token) => {
            axios.post('/fcm-token', { token: token.value }).catch((err) => {
                console.error('Error al guardar token FCM en servidor:', err);
            });
        }).then((sub) => {
            regSub = sub;
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Notificación push recibida:', notification);
        }).then((sub) => {
            notifSub = sub;
        });

        registrarPush();

        return () => {
            if (regSub) regSub.remove();
            if (notifSub) notifSub.remove();
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-100">

            <nav className="border-b border-black/10 bg-institucional shadow-md text-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link
        href={
            usuarioLogueado.role === 'notificador'
                ? route('notificador.agenda')
                : route('dashboard')
        }
    >
        <ApplicationLogo className="block h-10 w-auto brightness-0 invert drop-shadow-sm" />
    </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex ">
                                {usuarioLogueado.role !== 'notificador' && (
                                    <React.Fragment>
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    Dashboard
                                </NavLink>

                                <NavLink
                                    href={route('documentos.cargar')}
                                    active={route().current('documentos.cargar')} 
                                >
                                    Notificaciones
                                </NavLink>
                                </React.Fragment>
                                )}
                      

                                {usuarioLogueado.role === 'notificador' && (
                                    <NavLink href={route('notificador.agenda')} active={route().current('notificador.agenda')}>
                                        Mi Agenda
                                    </NavLink>
                                )}  

                                {usuarioLogueado.role === 'administrador' && (
                                    <NavLink href={route('usuarios.index')} active={route().current('usuarios.index')}>
                                        Administrar Personal
                                    </NavLink>
                                )}  

                                {usuarioLogueado.role === 'administrador' && (
                                    <NavLink 
                                    href={route('catalogos.index')} 
                                    active={route().current('catalogos.index')}
                                    >
                                    Catálogos
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium leading-4 text-white transition duration-150 ease-in-out hover:bg-white/20 focus:outline-none"
                                            >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            Perfil
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            Cerrar Sesión
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-white/80 transition duration-150 ease-in-out hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        {usuarioLogueado.role !== 'notificador' && (
                        <React.Fragment>
                        <ResponsiveNavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                        >
                            Dashboard
                        </ResponsiveNavLink>

                        <ResponsiveNavLink
                            href={route('documentos.cargar')}
                            active={route().current('documentos.cargar')}
                        >
                            Notificaciones
                        </ResponsiveNavLink>
                        </React.Fragment>
                        )}

                        {usuarioLogueado.role === 'notificador' && (
                            <ResponsiveNavLink href={route('notificador.agenda')} active={route().current('notificador.agenda')}>
                                Mi Agenda
                            </ResponsiveNavLink>
                        )}

                        

                        {usuarioLogueado.role === 'administrador' && (
                            <ResponsiveNavLink href={route('usuarios.index')} active={route().current('usuarios.index')}>
                                Administrar Personal
                            </ResponsiveNavLink>
                        )}

                        {usuarioLogueado.role === 'administrador' && (
                            <ResponsiveNavLink 
                            href={route('catalogos.index')} 
                            active={route().current('catalogos.index')}
                            >
                            Catálogos
                            </ResponsiveNavLink>
                        )}



                    </div>

                    <div className="border-t border-white/20 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-white">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-white/70">
                                {user.email}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>
                                Perfil
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                            >
                                Cerrar Sesión
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

        {/* 🏛️ FRANJA INSTITUCIONAL ULTRA DELGADA HASTA ARRIBA DE TODO */}
        <div className="relative w-full h-3 bg-stone-900 overflow-hidden border-b border-[#9D2449]/20">
            <img 
                src="/banner.png" 
                alt="Identidad Gubernamental" 
                className="w-full h-full object-cover opacity-100"
            />
        </div>

            {header && (
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="px-5 sm:px-0"> {children}</main>
        </div>
    );
}
