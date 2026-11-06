# ---- Stage 1: build front-end assets ----
FROM node:20-alpine AS assets

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Stage 2: PHP application (Nginx + PHP-FPM under supervisor) ----
FROM php:8.2-fpm-alpine

WORKDIR /var/www

# Extensions the app needs. pdo_sqlite and mbstring ship with the base image.
#   pdo_pgsql - PostgreSQL (libpq-dev: client headers only; postgresql-dev
#               would pull in the full LLVM toolchain the app never uses)
#   zip       - reading DOCX credentials (CredentialAnalyzer)
#   opcache   - compile the app once instead of on every request (WPR 09, F-03)
RUN apk add --no-cache nginx supervisor libzip-dev libpq-dev \
    && docker-php-ext-install pdo_pgsql zip opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY --chown=www-data:www-data . .

RUN composer install --no-interaction --no-dev --optimize-autoloader --no-progress

# Laravel's writable directories. .dockerignore keeps the developer's local
# copies out of the image, so they must be created here or the first request
# fails on sessions, cache, compiled views and logs.
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views \
             storage/logs storage/app/private storage/app/public bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chown -R www-data:www-data /var/lib/nginx
# ^ nginx workers run as www-data (nginx.conf), but Alpine creates nginx's temp
#   directory for user "nginx" with mode 700. Request bodies over the in-memory
#   buffer (~16 KB) are spooled there, so without this every file upload fails.

COPY --from=assets /app/public/build public/build
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-skillbridge.ini
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080

# Migrations only - seeders are never run automatically. Migrate runs as root,
# so anything it writes under storage/ is handed back to www-data before PHP-FPM
# starts; otherwise a root-owned log or cache file causes permission errors later.
CMD ["sh", "-c", "php artisan migrate --force --no-interaction && chown -R www-data:www-data storage bootstrap/cache && exec /usr/bin/supervisord -c /etc/supervisord.conf"]
