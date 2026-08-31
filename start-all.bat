@echo off
cd /d "%~dp0"
echo Starting Laravel backend server and Vite frontend server...
start "EstateLink - Laravel Backend" cmd /k "php artisan serve"
start "EstateLink - Vite Frontend" cmd /k "npm run dev"
echo Both servers have been launched in separate windows!
echo Backend: http://127.0.0.1:8000
