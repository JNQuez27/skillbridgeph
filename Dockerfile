# Stage 1: Asset Builder
FROM node:20-alpine as builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: PHP Backend
FROM php:8.2-fpm-alpine

WORKDIR /var/www

# Install system dependencies for Laravel
RUN apk --no-cache add \
    nginx \
    supervisor \
    curl \
    libzip-dev \
    zip \
    && docker-php-ext-install pdo pdo_mysql zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy application code (excluding node_modules, etc. via .dockerignore)
COPY --chown=www-data:www-data . .

# Generate app key
RUN php artisan key:generate

# Install PHP dependencies
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Set correct permissions for storage and bootstrap cache
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Copy Nginx and Supervisor configurations
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
