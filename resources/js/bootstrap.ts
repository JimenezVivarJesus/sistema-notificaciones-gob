/*import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';*/

import axios from 'axios';
//import Echo from 'laravel-echo';
//import Pusher from 'pusher-js';

// 1. Configuración global nativa de Axios para peticiones HTTP
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// 2. Vinculamos Pusher a la ventana global para que Echo pueda heredar sus métodos de red
//(window as any).Pusher = Pusher;

/*/ 3. 🚀 INICIALIZACIÓN DE LARAVEL REVERB (WebSockets en Tiempo Real)
(window as any).Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT) : 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT) : 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});*/

/*
(window as any).Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'iorakvfhhvrly4no7aje',
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: 8080,
    wssPort: 8080,
    forceTLS: false, // Sin certificados SSL en localhost
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
})*/

