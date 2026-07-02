@echo off
title Inventory System
echo Starting Inventory System with Docker...
echo.
docker compose up -d --build
if %errorlevel% neq 0 (
    echo.
    echo Docker failed. Make sure Docker Desktop is running.
    echo Try the PowerShell launcher instead: right-click start.ps1 ^> "Run with PowerShell"
    pause
    exit /b %errorlevel%
)
echo.
echo Backend: http://localhost:80/api/
echo Frontend: http://localhost:80
echo.
echo Login: manager / manager123
echo.
echo Press any key to stop...
pause >nul
docker compose down
