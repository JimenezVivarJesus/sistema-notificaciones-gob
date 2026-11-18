import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-white bg-white/15 text-white font-bold focus:border-white focus:bg-white/20 focus:text-white'
                    : 'border-transparent text-white/80 hover:border-white/40 hover:bg-white/10 hover:text-white focus:border-white/40 focus:bg-white/10 focus:text-white'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
