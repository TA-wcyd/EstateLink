@echo off
cd /d "%~dp0"
echo ========================================================
echo Installing Backend (PHP Composer) Dependencies...
echo ========================================================
call composer install

echo.
echo ========================================================
echo Installing Frontend (NPM) Dependencies...
echo ========================================================
call npm install

echo.
echo ========================================================
echo Generating Application Key...
echo ========================================================
call php artisan key:generate

echo.
echo ========================================================
echo Running Database Migrations and Seeders...
echo ========================================================
echo (Make sure your MySQL server is running)
call php artisan migrate --seed

echo.
echo ========================================================
echo Setup Complete!
echo You can now run 'start-all.bat' to start the project.
echo ========================================================
pause
