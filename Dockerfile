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
    sqlite \
    && docker-php-ext-install pdo pdo_mysql pdo_sqlite zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy application code
COPY --chown=www-data:www-data . .

# Copy .env file
COPY --chown=www-data:www-data .env /var/www/.env

# Install PHP dependencies
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Generate app key (now works because .env exists)
RUN php artisan key:generate --force

# Create SQLite database file
RUN mkdir -p /var/www/database && \
    touch /var/www/database/database.sqlite && \
    chown -R www-data:www-data /var/www/database

# Run migrations
RUN php artisan migrate --force --no-interaction

# Set correct permissions for storage and bootstrap cache
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache && \
    chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Copy built assets from Stage 1
COPY --from=builder /app/public/build /var/www/public/build

# Copy Nginx and Supervisor configurations
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]