#!/bin/sh
set -e

# Render passes PORT dynamically. Default to 8000 for local containers.
PORT=${PORT:-8000}

echo "=== EstateLink Container Startup ==="

# Run database migrations before starting the web server
echo "Running database migrations..."
php artisan migrate --force || echo "Warning: Database migration failed or database unreachable. Continuing startup..."

# Cache config and routes if in production mode
if [ "$APP_ENV" = "production" ]; then
    echo "Caching Laravel config and routes for production..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

echo "Starting application server on 0.0.0.0:$PORT..."
exec php artisan serve --host=0.0.0.0 --port="$PORT"
