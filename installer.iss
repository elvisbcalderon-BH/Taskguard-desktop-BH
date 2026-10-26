; Script generado para compilar el instalador nativo de Windows para TaskGuard Desktop
#define MyAppName "TaskGuard Desktop"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Blessing Hands"
#define MyAppURL "https://github.com/elvisbcalderon-BH/Taskguard-desktop-BH"
#define MyAppExeName "TaskGuard.bat"

[Setup]
; Identificador de aplicacion unico
AppId={{5A8E19F4-C3D2-48F6-A785-32B8E5F7061A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\TaskGuard Desktop
DisableProgramGroupPage=yes
; Icono del instalador
SetupIconFile=taskguard.ico
UninstallDisplayIcon={app}\taskguard.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
OutputDir=Output
OutputBaseFilename=TaskGuard-Desktop-Setup-v1.1
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Copiar todos los archivos compilados del bundle
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
; Copiar el ejecutable / lanzador y el micro-servidor nativo
Source: "launch-production.bat"; DestDir: "{app}"; DestName: "TaskGuard.bat"; Flags: ignoreversion
Source: "TaskGuardServer.exe"; DestDir: "{app}"; Flags: ignoreversion
; Copiar icono y metadatos
Source: "taskguard.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Acceso directo en el menu Inicio
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\taskguard.ico"; Comment: "TaskGuard Desktop - Gestion de Tareas y Operaciones BH"
; Acceso directo en el Escritorio
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\taskguard.ico"; Comment: "TaskGuard Desktop - Gestion de Tareas y Operaciones BH"; Tasks: desktopicon

[Run]
; Opcion para ejecutar la app al terminar la instalacion
Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Filename: "{app}\{#MyAppExeName}"; Flags: shellexec postinstall skipifsilent
