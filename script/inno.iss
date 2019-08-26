[Setup]
AppId={#AppId}
AppName={#Name}
AppVersion={#Version}
AppVerName={#Name} {#Version}
AppPublisher={#Publisher}
AppPublisherURL={#URL}
AppSupportURL={#URL}
AppUpdatesURL={#URL}
DefaultGroupName={#Name}
AllowNoIcons=yes
OutputDir={#OutputDir}
OutputBaseFilename={#Name}-v{#Version}-win32-{#Arch}-setup
Compression=lzma
SolidCompression=yes
SetupIconFile={#SetupIconFile}
UninstallDisplayIcon={app}\{#Name}.exe
; ChangesAssociations=true
SourceDir={#SourceDir}
ShowLanguageDialog=auto
ArchitecturesAllowed={#ArchitecturesAllowed}
ArchitecturesInstallIn64BitMode={#ArchitecturesInstallIn64BitMode}
DefaultDirName={autopf}\{#Name}
Uninstallable=yes
UninstallDisplayName={#Name}
;DisableProgramGroupPage=yes
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest

;WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\resources"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#Name}"; Filename: "{app}\{#Name}.exe"
Name: "{group}\Uninstall {#Name}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#Name}"; Filename: "{app}\{#Name}.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\{#Name}.exe"; Description: "{cm:LaunchProgram,{#Name}}"; Flags: nowait postinstall; Check: WizardNotSilent

[Code]
function WizardNotSilent(): Boolean;
begin
  Result := not WizardSilent();
end;
