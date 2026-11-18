import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sefin.notificaciones',
  appName: 'Notificaciones SEFIN',
  webDir: 'public',
  server: {
    url: 'https://sistema-notificaciones-knqh.onrender.com',
    cleartext: true,
    errorPath: 'offline.html'
  }
};

export default config;

