import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                institucional: {
                    DEFAULT: '#9D2449',
                    hover: '#B38E5D', // Un tono ligeramente más oscuro para los efectos hover
                    claro: '#fdf2f0', // Un tono ultra claro para fondos suaves o alertas
                }
            },
        },
    },

    plugins: [forms],
};
