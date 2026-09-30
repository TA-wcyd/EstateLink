# ========================================================
# Stage 1: Build Frontend Assets (Vite + NPM)
# ========================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package dependency manifests
COPY package.json package-lock.json ./

# Install npm dependencies
RUN npm ci

# Copy Vite configuration and source files
COPY vite.config.js ./
COPY resources ./resources
COPY public ./public

# Build production assets (outputs to public/build)
RUN npm run build

# ========================================================
# Stage 2: PHP Application Runtime
# ========================================================
FROM php:8.2-cli-alpine

WORKDIR /var/www/html

# Install required system tools and PHP extensions
RUN apk add --no-cache \
    postgresql-client \
    bash \
    curl \
    libpng-dev \
    libxml2-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    && curl -sSLf https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o /usr/local/bin/install-php-extensions \
    && chmod +x /usr/local/bin/install-php-extensions \
    && install-php-extensions \
        pdo_pgsql \
        pgsql \
        bcmath \
        mbstring \
        xml \
        ctype \
        json \
        tokenizer \
        curl \
        zip \
        intl \
        pcntl \
        opcache

# Copy Composer binary from official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy composer dependency definitions
COPY composer.json composer.lock ./

# Install Composer dependencies without dev packages
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# Copy application source code
COPY . .

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder /app/public/build ./public/build

# Complete Composer autoloader optimization and ensure writable directories
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Copy entrypoint script and set execution permissions
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Default PORT if not injected by Render (Render supplies $PORT dynamically)
ENV PORT=8000
EXPOSE ${PORT}

ENTRYPOINT ["docker-entrypoint.sh"]
