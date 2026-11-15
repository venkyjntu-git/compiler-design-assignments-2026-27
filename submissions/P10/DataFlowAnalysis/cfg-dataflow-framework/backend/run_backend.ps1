# CFG Data-Flow Analysis Framework - Backend PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CFG and Data-Flow Analysis Framework - FastAPI Backend" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 1. Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "[ERROR] Python was not found in your system PATH!" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/" -ForegroundColor Yellow
    Write-Host "Ensure 'Add Python to PATH' is checked during setup." -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "[*] Python executable located: $($pythonCmd.Source)" -ForegroundColor Green
python --version

# 2. Check virtual environment
if (-not (Test-Path ".\venv\Scripts\Activate.ps1")) {
    Write-Host "[*] Creating virtual environment in .\venv ..." -ForegroundColor Yellow
    python -m venv venv
}

# 3. Activate virtual environment safely
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    Write-Host "[*] Activating virtual environment..." -ForegroundColor Green
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force -ErrorAction SilentlyContinue
    & ".\venv\Scripts\Activate.ps1"
}

# 4. Install dependencies
Write-Host "[*] Ensuring required packages are installed from requirements.txt..." -ForegroundColor Yellow
python -m pip install -r requirements.txt --quiet

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting FastAPI Server at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Swagger API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "  Press Ctrl + C to stop the server." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 5. Run uvicorn via python -m (eliminates PATH / command not found issues)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

