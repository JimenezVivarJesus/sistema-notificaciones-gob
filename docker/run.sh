#!/bin/sh
set -e

PORT=${PORT:-80}
export PORT

# Configura el puerto dinamico de Render
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf

# Enlace simbolico de storage
php artisan storage:link || true

# Descubrir paquetes de Laravel
php artisan package:discover --ansi || true

# Ejecuta las migraciones en PostgreSQL
php artisan migrate --force || true

# Ejecuta los seeders para crear usuarios iniciales
php artisan db:seed --force || true

# Cache de configuracion y rutas para velocidad
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Inicia Apache en primer plano
exec apache2-foreground

