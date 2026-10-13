# ============================================================================
#  构建 C++ / WebView2 宿主并打包为单文件 exe
#
#  编译器：使用系统已装的 LLVM/MinGW 工具链（Windhawk 自带 clang 20 + MinGW-w64）
#    clang++  --target=x86_64-w64-windows-gnu
#    C:\Program Files\Windhawk\Compiler\bin\clang++.exe
#
#  用法：  pwsh -File host\build.ps1
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

# 注意：项目位于 Desktop，build-venv 的 Python 无写权限，必须用 DSH 自带运行时
$py = 'C:\Users\_anmuxi_\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
if (-not (Test-Path $py)) { $py = Join-Path $Workspace 'build-venv\Scripts\python.exe' }
if (-not (Test-Path $py)) { $py = 'python' }

$clang = Join-Path $ClangDir 'bin\clang++.exe'
if (-not (Test-Path $clang)) { throw "找不到 clang++: $clang" }
if (-not (Test-Path (Join-Path $sdk 'WebView2.h'))) { throw "缺少 WebView2.h: $sdk" }
if (-not (Test-Path (Join-Path $sdk 'WebView2Loader.dll'))) { throw "缺少 WebView2Loader.dll: $sdk" }

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

# --- 1) 编译 ---
$exe = Join-Path $buildDir 'MIDI Player.exe'
Remove-Item $exe -Force -ErrorAction SilentlyContinue
$compileArgs = @(
    '--target=x86_64-w64-windows-gnu',
    '-O2', '-std=c++17', '-municode', '-mwindows',
    '-DUNICODE', '-D_UNICODE', '-DWIN32_LEAN_AND_MEAN',
    '-static', '-static-libgcc', '-static-libstdc++',
    "-I$sdk", "-I$hostDir",
    (Join-Path $hostDir 'main.cpp'),
    (Join-Path $hostDir 'payload.cpp'),
    '-o', $exe,
    '-lole32', '-loleaut32', '-luuid', '-lshlwapi',
    '-ladvapi32', '-lshell32', '-luser32', '-lgdi32', '-lcomdlg32'
)
Write-Host '编译中 …'
& $clang @compileArgs
if ($LASTEXITCODE -ne 0) { throw '编译失败' }
Write-Host ("宿主 exe: {0:N2} MB" -f ((Get-Item $exe).Length / 1MB))

# --- 2) 嵌入图标 ---
& $py (Join-Path $hostDir 'seticon.py') $exe (Join-Path $ProjectDir 'icon.ico')
if ($LASTEXITCODE -ne 0) { throw '图标嵌入失败' }

# --- 3) 追加资源包（assets + soundfonts + WebView2Loader）---
& $py (Join-Path $hostDir 'pack.py') $exe
if ($LASTEXITCODE -ne 0) { throw '资源打包失败' }

Write-Host '完成 ✓'
