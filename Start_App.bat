@echo off
title Prompt Builder Starter
color 0A

echo ===================================================
echo     Starting Prompt Builder (Backend ^& Frontend)
echo ===================================================
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
exit
