@echo off
title TaskGuard Desktop Launcher
cd /d "%~dp0"

:: 1. Comprobar si el servidor local ya está respondiendo en el puerto 5890
powershell -NoProfile -Command "$res = try { (Invoke-WebRequest -Uri 'http://localhost:5890' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { 0 }; if ($res -ne 200) { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    :: Iniciar el micro-servidor nativo silenciosamente
    start "" /b "%~dp0TaskGuardServer.exe"
    timeout /t 1 /nobreak >nul
)

:: 2. Lanzar la ventana de la aplicacion en modo Desktop
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5890 --window-size=1300,860 --window-name="TaskGuard Desktop"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5890 --window-size=1300,860
) else (
    start http://localhost:5890
)
exit
