# EstateLink - Setup & Install Dependencies
Set-Location -Path $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Installing Composer (PHP) Dependencies..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
composer install

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "2. Installing NPM (Node.js) Dependencies..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
npm install

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "3. Generating Application Key..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
php artisan key:generate

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "4. Running Database Migrations & Seeds..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
php artisan migrate --seed

Write-Host "`nSetup finished! Run .\run.ps1 or 'php artisan serve' to start." -ForegroundColor Yellow
