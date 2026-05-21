@echo off
title Install Dependencies
color 0E

echo ===================================================
echo   Installing Dependencies for Prompt Builder
echo ===================================================
echo.
echo This might take a few minutes. Please wait...
echo.

echo [1/2] Installing Backend dependencies...
cd backend
call npm install
cd ..

echo.
echo [2/2] Installing Frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ===================================================
echo   Installation Complete!
echo ===================================================
echo You can now run Start_App.bat
pause
