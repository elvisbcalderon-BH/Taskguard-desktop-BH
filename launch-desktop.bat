@echo off
title TaskGuard Desktop Launcher
cd /d "%~dp0"

:: Verificar si el servidor ya esta corriendo
powershell -Command "$res = try { (Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { 0 }; if ($res -ne 200) { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo Iniciando backend local de TaskGuard Desktop...
    start /min "" cmd /c "npm run dev"
    timeout /t 2 /nobreak >nul
)

:: Lanzar en ventana de aplicacion de escritorio nativa (sin barra de direcciones ni pestanas)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --window-size=1280,840 --window-name="TaskGuard Desktop"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173 --window-size=1280,840
) else (
    start http://localhost:5173
)
exit
