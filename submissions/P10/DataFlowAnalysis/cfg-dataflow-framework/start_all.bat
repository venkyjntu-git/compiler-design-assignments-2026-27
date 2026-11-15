@echo off
title CFG & Data-Flow Analysis Framework - Full Suite Launcher
echo ========================================================
echo   CFG and Data-Flow Analysis Framework - Quick Launch
echo ========================================================
echo.

cd /d "%~dp0"

echo [*] Launching FastAPI Backend Server in a new window...
start "CFG Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && run_backend.bat"

timeout /t 2 /nobreak >nul

echo [*] Launching React + Vite Frontend in a new window...
start "CFG Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [*] Opening Framework in your default web browser...
start http://localhost:5173/

echo.
echo ========================================================
echo   Both services are now running!
echo   Frontend : http://localhost:5173/
echo   Backend  : http://127.0.0.1:8000/
echo   API Docs : http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause

