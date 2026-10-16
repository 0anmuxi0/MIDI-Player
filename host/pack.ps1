# ============================================================================
#  Pack frontend output, soundfonts and WebView2Loader into a resource pack
#  appended to the tail of the host exe.
#
#  Tail layout:
#      [original exe][zip data][uint64 zipSize][uint64 zipOffset][8B "MIDIPAY1"]
#
#  The host maps the whole exe into memory and slices single files out of the
#  zip on demand - no extraction, no temporary files.
#
#  Pure PowerShell (.NET ZipArchive). No Python required.
#
#  Usage:  pwsh -File host/pack.ps1 [-ExePath <exe>] [-SdkDir <dir with WebView2Loader.dll>]
# ============================================================================
[CmdletBinding()]
param(
    [string]$ExePath = '',
    [string]$SdkDir = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$hostDir = $PSScriptRoot
$projectDir = Split-Path $hostDir -Parent
$buildDir = Join-Path $hostDir 'build'

if (-not $ExePath) { $ExePath = Join-Path $buildDir 'MIDI Player.exe' }
if (-not (Test-Path $ExePath)) { throw "host exe not found: $ExePath" }

# Locate WebView2Loader.dll
if (-not $SdkDir) {
    $candidates = @(
        (Join-Path $projectDir 'tools\webview2sdk'),
        (Join-Path $hostDir '..\tools\webview2sdk'),
        'C:\Users\_anmuxi_\Documents\deepseek-harness\default-workspace\tools\webview2sdk'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path (Join-Path $candidate 'WebView2Loader.dll')) { $SdkDir = $candidate; break }
    }
}
$loaderDll = if ($SdkDir) { Join-Path $SdkDir 'WebView2Loader.dll' } else { '' }
if (-not (Test-Path $loaderDll)) { throw "WebView2Loader.dll not found (pass -SdkDir)" }

$zipPath = Join-Path $buildDir 'payload.zip'
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

# ---------------------------------------------------------------------------
# 1) Build the pack (ZIP_STORED: store only, so the host can slice directly)
# ---------------------------------------------------------------------------
$sources = @(
    @{ Prefix = 'assets'; Path = (Join-Path $projectDir 'assets') },
    @{ Prefix = 'soundfonts'; Path = (Join-Path $projectDir 'soundfonts') }
)

$count = 0
$totalBytes = 0L

$archive = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    foreach ($source in $sources) {
        $root = $source.Path
        if (-not (Test-Path $root)) {
            Write-Warning "missing directory (skipped): $root"
            continue
        }
        Get-ChildItem $root -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
            $entryName = "$($source.Prefix)/$relative"
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, $_.FullName, $entryName,
                [System.IO.Compression.CompressionLevel]::NoCompression) | Out-Null
            $count++
            $totalBytes += $_.Length
        }
    }

    # WebView2Loader.dll goes to the pack root
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $archive, $loaderDll, 'WebView2Loader.dll',
        [System.IO.Compression.CompressionLevel]::NoCompression) | Out-Null
    $count++
    $totalBytes += (Get-Item $loaderDll).Length
}
finally {
    $archive.Dispose()
}

if ($count -eq 0) { throw 'resource pack is empty (assets and soundfonts both missing?)' }
Write-Host ("Pack: {0} files, {1:N1} MB" -f $count, ($totalBytes / 1MB))

# ---------------------------------------------------------------------------
# 2) Append to the exe tail
# ---------------------------------------------------------------------------
$payload = [System.IO.File]::ReadAllBytes($zipPath)
$exeFull = (Resolve-Path $ExePath).Path
$offset = (Get-Item $exeFull).Length
$magic = [System.Text.Encoding]::ASCII.GetBytes('MIDIPAY1')

$stream = [System.IO.File]::Open($exeFull, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write)
try {
    $stream.Write($payload, 0, $payload.Length)
    $stream.Write([BitConverter]::GetBytes([uint64]$payload.Length), 0, 8)
    $stream.Write([BitConverter]::GetBytes([uint64]$offset), 0, 8)
    $stream.Write($magic, 0, 8)
}
finally {
    $stream.Close()
}

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

$finalSize = (Get-Item $exeFull).Length
Write-Host ("Appended: offset={0} size={1:N1} MB" -f $offset, ($payload.Length / 1MB))
Write-Host ("Final exe: {0}  {1:N1} MB" -f $exeFull, ($finalSize / 1MB))
