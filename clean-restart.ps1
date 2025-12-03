Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CLEAN RESTART - FleetTrack Dev Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Stopping Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Step 2: Clearing cache folders..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Write-Host "Cache cleared!" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Reinstalling dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Step 4: Starting fresh dev server..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
npm run dev
