$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "TaskGuard Desktop.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "c:\Users\elvis\OneDrive\Desktop\Taskguard-desktop BH\launch-production.bat"
$Shortcut.WorkingDirectory = "c:\Users\elvis\OneDrive\Desktop\Taskguard-desktop BH"
$Shortcut.IconLocation = "c:\Users\elvis\OneDrive\Desktop\Taskguard-desktop BH\taskguard.ico, 0"
$Shortcut.Description = "TaskGuard Desktop - Production Engine (HIPAA / PHI & Financial Priority)"
$Shortcut.Save()

Write-Host "PRODUCTION_SHORTCUT_UPDATED_SUCCESSFULLY"
