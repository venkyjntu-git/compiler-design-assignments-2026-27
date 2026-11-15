@echo off
title CodeGuard AI - AST Clone & Plagiarism Detection System
echo ==============================================================
echo   CodeGuard AI - AST-Based Code Clone & Plagiarism Detector
echo   Compiler Design Academic Project
echo ==============================================================
echo.
echo Launching server on http://127.0.0.1:5000...
echo Opening browser...
start http://127.0.0.1:5000

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" run.py
) else (
    py run.py 2>nul || python run.py
)
pause
