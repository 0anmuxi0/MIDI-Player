# ============================================================================
#  Pack frontend output, soundfonts and WebView2Loader into a resource pack
#  appended to the tail of the host exe.
#
#  Tail layout:
#      [original exe][zip data][uint64 zipSize][uint64 zipOffset][8B "MIDIPAY1"]
#
#  IMPORTANT: every entry must use method 0 (Stored / no compression), because
#  the host slices files straight out of the mapped zip without inflating.
#  .NET's ZipArchive cannot emit Stored entries (its NoCompression level still
#  uses Deflate), so the zip is written by hand here.
#
#  CRC32 is left at 0: the host does not verify it, and skipping the checksum
#  keeps this fast. Use any third-party tool on the host exe instead — the zip
#  is only ever read by our own loader.
#
#  Pure PowerShell. No Python required.
#
#  Usage:  pwsh -File host/pack.ps1 [-ExePath <exe>] [-SdkDir <dir with WebView2Loader.dll>]
# ============================================================================
[CmdletBinding()]
param(
    [string]$ExePath = '',
    [string]$SdkDir = ''
)

$ErrorActionPreference = 'Stop'

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

# ---------------------------------------------------------------------------
# Collect the files to pack:  <zip path> = <source path>
# ---------------------------------------------------------------------------
$items = [System.Collections.Generic.List[object]]::new()

foreach ($source in @(
    @{ Prefix = 'assets'; Root = (Join-Path $projectDir 'assets') },
    @{ Prefix = 'soundfonts'; Root = (Join-Path $projectDir 'soundfonts') }
)) {
    if (-not (Test-Path $source.Root)) {
        Write-Warning "missing directory (skipped): $($source.Root)"
        continue
    }
    Get-ChildItem $source.Root -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($source.Root.Length).TrimStart('\', '/').Replace('\', '/')
        $items.Add([PSCustomObject]@{
            Name = "$($source.Prefix)/$relative"
            Path = $_.FullName
            Size = $_.Length
        })
    }
}

# WebView2Loader.dll goes to the pack root
$items.Add([PSCustomObject]@{
    Name = 'WebView2Loader.dll'
    Path = $loaderDll
    Size = (Get-Item $loaderDll).Length
})

if ($items.Count -eq 0) { throw 'resource pack is empty' }

$zipPath = Join-Path $buildDir 'payload.zip'
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

# ---------------------------------------------------------------------------
# Write a Stored-only zip by hand
# ---------------------------------------------------------------------------
$utf8 = [System.Text.Encoding]::UTF8
$totalBytes = 0L

$stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$writer = [System.IO.BinaryWriter]::new($stream)
$central = [System.Collections.Generic.List[object]]::new()
$offset = 0L

try {
    foreach ($item in $items) {
        $nameBytes = $utf8.GetBytes($item.Name)
        $data = [System.IO.File]::ReadAllBytes($item.Path)
        $size = [uint32]$data.Length

        # Local file header
        $writer.Write([byte[]]@(0x50, 0x4B, 0x03, 0x04))
        $writer.Write([uint16]20)          # version needed to extract
        $writer.Write([uint16]0x0800)      # flags: file name is UTF-8
        $writer.Write([uint16]0)           # method: 0 = Stored
        $writer.Write([uint16]0)           # mod time
        $writer.Write([uint16]0x21)        # mod date = 1980-01-01
        $writer.Write([uint32]0)           # crc32 (not verified by the host)
        $writer.Write($size)               # compressed size
        $writer.Write($size)               # uncompressed size
        $writer.Write([uint16]$nameBytes.Length)
        $writer.Write([uint16]0)           # extra field length
        $writer.Write($nameBytes)
        $writer.Write($data)

        $central.Add([PSCustomObject]@{ Name = $nameBytes; Size = $size; Offset = [uint32]$offset })
        $offset += 30 + $nameBytes.Length + $data.Length
        $totalBytes += $data.Length
    }

    # Central directory
    $centralOffset = $offset
    foreach ($entry in $central) {
        $writer.Write([byte[]]@(0x50, 0x4B, 0x01, 0x02))
        $writer.Write([uint16]20)          # version made by
        $writer.Write([uint16]20)          # version needed
        $writer.Write([uint16]0x0800)      # flags
        $writer.Write([uint16]0)           # method: Stored
        $writer.Write([uint16]0)           # mod time
        $writer.Write([uint16]0x21)        # mod date
        $writer.Write([uint32]0)           # crc32
        $writer.Write($entry.Size)
        $writer.Write($entry.Size)
        $writer.Write([uint16]$entry.Name.Length)
        $writer.Write([uint16]0)           # extra
        $writer.Write([uint16]0)           # comment
        $writer.Write([uint16]0)           # disk number start
        $writer.Write([uint16]0)           # internal attributes
        $writer.Write([uint32]0)           # external attributes
        $writer.Write($entry.Offset)
        $writer.Write($entry.Name)
        $offset += 46 + $entry.Name.Length
    }
    $centralSize = $offset - $centralOffset

    # End of central directory
    $writer.Write([byte[]]@(0x50, 0x4B, 0x05, 0x06))
    $writer.Write([uint16]0)               # this disk
    $writer.Write([uint16]0)               # disk with central directory
    $writer.Write([uint16]$central.Count)  # entries on this disk
    $writer.Write([uint16]$central.Count)  # total entries
    $writer.Write([uint32]$centralSize)
    $writer.Write([uint32]$centralOffset)
    $writer.Write([uint16]0)               # comment length
}
finally {
    $writer.Close()
    $stream.Close()
}

Write-Host ("Pack: {0} files, {1:N1} MB (all Stored)" -f $items.Count, ($totalBytes / 1MB))
Write-Host ("Zip: {0} bytes" -f (Get-Item $zipPath).Length)

# ---------------------------------------------------------------------------
# Append to the exe tail
# ---------------------------------------------------------------------------
$payload = [System.IO.File]::ReadAllBytes($zipPath)
$exeFull = (Resolve-Path $ExePath).Path
$baseOffset = (Get-Item $exeFull).Length
$magic = [System.Text.Encoding]::ASCII.GetBytes('MIDIPAY1')

$append = [System.IO.File]::Open($exeFull, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write)
try {
    $append.Write($payload, 0, $payload.Length)
    $append.Write([BitConverter]::GetBytes([uint64]$payload.Length), 0, 8)
    $append.Write([BitConverter]::GetBytes([uint64]$baseOffset), 0, 8)
    $append.Write($magic, 0, 8)
}
finally {
    $append.Close()
}

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

$finalSize = (Get-Item $exeFull).Length
Write-Host ("Appended: offset={0} size={1:N1} MB" -f $baseOffset, ($payload.Length / 1MB))
Write-Host ("Final exe: {0}  {1:N1} MB" -f $exeFull, ($finalSize / 1MB))
