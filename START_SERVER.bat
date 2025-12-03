@echo off
echo ========================================
echo FleetTrack Development Server
echo ========================================
echo.
echo Starting server on http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0"
call npm run dev

pause
