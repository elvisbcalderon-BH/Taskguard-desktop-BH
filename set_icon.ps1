$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\elvis\OneDrive\Desktop\TaskGuard Desktop.lnk")
$Shortcut.TargetPath = "c:\Users\elvis\OneDrive\Desktop\Taskguard-desktop BH\launch-desktop.bat"
$Shortcut.WorkingDirectory = "c:\Users\elvis\OneDrive\Desktop\Taskguard-desktop BH"
$Shortcut.IconLocation = "c:\Users\elvis\OneDrive\Desktop\Taskguard-desktop BH\taskguard.ico, 0"
$Shortcut.Description = "TaskGuard Desktop - Medical Security & Priority Engine"
$Shortcut.Save()
Write-Host "SHORTCUT_ICON_UPDATED"
