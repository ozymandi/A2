@echo off
setlocal EnableDelayedExpansion
title Prompt Builder Starter
color 0A

echo ===================================================
echo     Starting Prompt Builder (Backend ^& Frontend)
echo ===================================================
echo.

echo Checking for previous instances...
call :killport 3001
for /L %%P in (5173,1,5179) do call :killport %%P
echo.

echo Starting Backend API...
start "Backend API (DO NOT CLOSE)" cmd /c "cd backend && node index.js"

echo Starting Frontend UI...
start "Frontend UI (DO NOT CLOSE)" cmd /c "cd frontend && npm run dev -- --open"

echo.
echo Both services are starting up!
echo Your browser should open automatically in a few seconds.
echo.
echo NOTE: Leave the two black terminal windows open while using the app.
echo To close the application, simply close the black terminal windows.
echo.
timeout /t 5
exit /b 0

:: ---------------------------------------------------------------
:: :killport <port>
:: Finds the process LISTENING on the given port. If it is node.exe
:: (our backend or Vite dev server), kills it. Anything else is left
:: alone and reported so the user can decide.
:: ---------------------------------------------------------------
:killport
set "PORT=%~1"
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
    set "PID=%%A"
    if not "!PID!"=="0" (
        set "IMG="
        for /f "tokens=1 delims=," %%B in ('tasklist /FI "PID eq !PID!" /FO CSV /NH') do set "IMG=%%~B"
        if /I "!IMG!"=="node.exe" (
            echo   Port %PORT% is held by node.exe [PID !PID!] - stopping it...
            taskkill /PID !PID! /F >nul 2>&1
        ) else (
            echo   WARNING: Port %PORT% is used by "!IMG!" [PID !PID!] - not touching it.
        )
    )
)
exit /b 0
