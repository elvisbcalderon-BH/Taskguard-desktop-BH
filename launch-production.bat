@echo off
title TaskGuard Desktop Launcher
cd /d "%~dp0"

:: Sincronización Automática de Código desde GitHub antes de abrir
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'SilentlyContinue'; try { $repo = 'elvisbcalderon-BH/Taskguard-desktop-BH'; $commit = (Invoke-RestMethod -Uri \"https://api.github.com/repos/$repo/commits/main\" -TimeoutSec 3).sha.Substring(0,7); $localVer = if (Test-Path 'dist\version.txt') { Get-Content 'dist\version.txt' -Raw } else { '' }; if ($commit -and ($commit.Trim() -ne $localVer.Trim())) { $zipUrl = \"https://raw.githubusercontent.com/$repo/main/bundle.zip\"; $zipPath = Join-Path $env:TEMP 'tg_update.zip'; Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -TimeoutSec 10; if (Test-Path $zipPath) { Expand-Archive -Path $zipPath -DestinationPath 'dist' -Force; Set-Content -Path 'dist\version.txt' -Value $commit -Force; Remove-Item $zipPath -Force } } } catch {}"

set "DIST_HTML=%~dp0dist\index.html"
set "USER_DATA=%LOCALAPPDATA%\TaskGuardDesktop\BrowserProfile"

if not exist "%USER_DATA%" (
    mkdir "%USER_DATA%" >nul 2>&1
)

:: Lanzar en ventana nativa de escritorio aislada usando el shell de Edge/Chrome (sin localhost, 100% nativo)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="file:///%DIST_HTML:\=/%" --user-data-dir="%USER_DATA%" --allow-file-access-from-files --window-size=1300,860 --window-name="TaskGuard Desktop"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="file:///%DIST_HTML:\=/%" --user-data-dir="%USER_DATA%" --allow-file-access-from-files --window-size=1300,860 --window-name="TaskGuard Desktop"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%DIST_HTML:\=/%" --user-data-dir="%USER_DATA%" --allow-file-access-from-files --window-size=1300,860
) else (
    start "" "%DIST_HTML%"
)
exit
