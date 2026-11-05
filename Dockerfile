# Etapa 1: Compilar frontend (Vite, React y Tailwind CSS)
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Etapa 2: Imagen de PHP 8.4 con Apache para produccion
FROM php:8.4-apache

# Dependencias del sistema y extensiones para Laravel, PostgreSQL y PhpSpreadsheet
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libpng-dev \
    libzip-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libicu-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_pgsql pgsql gd zip bcmath intl exif \
    && a2enmod rewrite \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Configurar limites de subida de PHP para fotos de smartphone en alta resolucion
RUN echo "upload_max_filesize = 32M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 32M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copiar el codigo del proyecto
COPY . .

# Copiar los assets compilados de React de la Etapa 1
COPY --from=frontend /app/public/build ./public/build

# Instalar dependencias de produccion de PHP
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction

# Permisos para storage y bootstrap/cache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Configuracion de Apache y script de arranque
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/run.sh /usr/local/bin/run.sh
RUN chmod +x /usr/local/bin/run.sh

EXPOSE 80

CMD ["/usr/local/bin/run.sh"]

