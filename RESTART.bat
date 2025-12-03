@echo off
echo ========================================
echo RESTARTING FLEETTRACK DEV SERVER
echo ========================================
echo.
echo Step 1: Killing old Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Clearing Vite cache...
if exist node_modules\.vite (
    rmdir /S /Q node_modules\.vite
    echo Vite cache cleared!
) else (
    echo No Vite cache to clear
)

if exist dist (
    rmdir /S /Q dist
    echo Dist folder cleared!
)

echo.
echo Step 3: Starting fresh dev server...
echo ========================================
echo.
call npm run dev

pause
