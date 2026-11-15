@echo off
title CFG Data-Flow Analysis Framework - Backend Service
echo ========================================================
echo   CFG and Data-Flow Analysis Framework - FastAPI Backend
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check for Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not found in your PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo [*] Python detected:
python --version

:: 2. Check and create virtual environment if missing
if not exist "venv\Scripts\activate.bat" (
    echo [*] Creating Python virtual environment in .\venv ...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Could not create virtual environment. Attempting to continue with global Python...
    )
)

:: 3. Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    echo [*] Activating virtual environment...
    call venv\Scripts\activate.bat
)

:: 4. Ensure dependencies are installed
echo [*] Checking and installing backend dependencies from requirements.txt...
python -m pip install -r requirements.txt --quiet
if %ERRORLEVEL% neq 0 (
    echo [WARNING] pip install returned warnings, attempting to start server...
)

echo.
echo ========================================================
echo   Starting FastAPI Server at http://127.0.0.1:8000
echo   API Documentation: http://127.0.0.1:8000/docs
echo   Press CTRL+C to stop the backend.
echo ========================================================
echo.

:: 5. Launch uvicorn via python -m (avoids PATH issues)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

if %ERRORLEVEL% neq 0 (
    echo.
    echo [FALLBACK] Direct uvicorn failed. Attempting fallback to python main.py...
    python main.py
)

pause

