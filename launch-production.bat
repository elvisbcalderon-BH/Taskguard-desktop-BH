@echo off
title TaskGuard Desktop (Production Engine)
cd /d "%~dp0"

:: Sincronizar mejoras de GitHub automaticamente al arrancar si hay conexion
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [TASKGUARD SYNC] Verificando mejoras en GitHub...
    git pull origin main --quiet >nul 2>&1
)

:: Verificar si el servidor de produccion ya esta activo en el puerto 5174
powershell -NoProfile -Command "$res = try { (Invoke-WebRequest -Uri 'http://localhost:5174' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { 0 }; if ($res -ne 200) { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo [PRODUCCION] Levantando TaskGuard Desktop en entorno optimizado...
    start /min "TaskGuardProdServer" cmd /c "npx -y serve -s dist -l 5174 --no-clipboard"
    timeout /t 2 /nobreak >nul
)

:: Abrir en ventana de escritorio nativa independiente (Frameless App Window)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5174 --window-size=1300,860 --window-name="TaskGuard Desktop"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5174 --window-size=1300,860
) else (
    start http://localhost:5174
)
exit
