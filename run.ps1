# EstateLink - Run Backend & Frontend Servers
Set-Location -Path $PSScriptRoot

Write-Host "Launching Laravel backend and Vite frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; php artisan serve"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev"

Write-Host "Laravel backend is running at: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Vite dev server is running." -ForegroundColor Cyan
