import { SVGAttributes } from 'react';

export default function ApplicationLogo(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src="/logo-oaxaca.png" // <-- Tu imagen en la carpeta public
            alt="Logo Oficial Institucional"
            className={`h-11 w-auto ${props.className || ''}`} // Controlamos un tamaño estándar por defecto
        />
    );
}
