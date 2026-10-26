@echo off
title TaskGuard Desktop
cd /d "%~dp0"

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
