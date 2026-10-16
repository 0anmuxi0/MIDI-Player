# ============================================================================
#  Build the C++ / WebView2 host into a single-file exe.
#
#  Pure PowerShell + clang. No Python or other runtime required.
#
#  Compiler: any clang++ / g++ targeting MinGW-w64.
#            Defaults to the LLVM 20 that ships with Windhawk on this machine.
#  Requires: WebView2.h and WebView2Loader.dll from the WebView2 SDK.
#
#  Usage:  powershell -ExecutionPolicy Bypass -File host\build.ps1
# ============================================================================
param(
    [string]$Workspace = "C:\Users\_anmuxi_\Documents\deepseek-harness\default-workspace",
    [string]$ProjectDir = "C:\Users\_anmuxi_\Desktop\Code\Reslese\MIDI-Player",
    [string]$ClangDir = "C:\Program Files\Windhawk\Compiler"
)

$ErrorActionPreference = 'Stop'
$sdk = Join-Path $Workspace 'tools\webview2sdk'
$hostDir = Join-Path $ProjectDir 'host'
$buildDir = Join-Path $hostDir 'build'

$clang = Join-Path $ClangDir 'bin\clang++.exe'
if (-not (Test-Path $clang)) { throw "clang++ not found: $clang" }
if (-not (Test-Path (Join-Path $sdk 'WebView2.h'))) { throw "WebView2.h not found: $sdk" }
if (-not (Test-Path (Join-Path $sdk 'WebView2Loader.dll'))) { throw "WebView2Loader.dll not found: $sdk" }

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

# --- 1) Compile ---
$exe = Join-Path $buildDir 'MIDI Player.exe'
Remove-Item $exe -Force -ErrorAction SilentlyContinue
$compileArgs = @(
    '--target=x86_64-w64-windows-gnu',
    '-O2', '-std=c++17', '-municode', '-mwindows',
    '-DUNICODE', '-D_UNICODE',
    '-D_WIN32_WINNT=0x0A00', '-DWINVER=0x0A00',
    '-static', '-static-libgcc', '-static-libstdc++',
    "-I$sdk", "-I$hostDir",
    (Join-Path $hostDir 'main.cpp'),
    (Join-Path $hostDir 'payload.cpp'),
    '-o', $exe,
    '-lole32', '-loleaut32', '-luuid', '-lshlwapi',
    '-ladvapi32', '-lshell32', '-luser32', '-lgdi32', '-lcomdlg32',
    '-ldwmapi', '-lurlmon'
)
Write-Host 'Compiling ...'
& $clang @compileArgs
if ($LASTEXITCODE -ne 0) { throw 'compile failed' }
Write-Host ("Host exe: {0:N2} MB" -f ((Get-Item $exe).Length / 1MB))

# --- 2) Embed icon (PowerShell + Win32 UpdateResource) ---
& (Join-Path $hostDir 'seticon.ps1') -ExePath $exe -IcoPath (Join-Path $ProjectDir 'icon.ico')

# --- 3) Append resource pack (assets + soundfonts + WebView2Loader) ---
& (Join-Path $hostDir 'pack.ps1') -ExePath $exe -SdkDir $sdk

Write-Host 'Build complete.'
