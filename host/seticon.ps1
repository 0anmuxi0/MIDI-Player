# ============================================================================
#  Embed an icon into the exe using the Win32 UpdateResource API.
#
#  The clang toolchain used here has no windres, so resources are written via
#  P/Invoke instead of a .rc file. Every size in icon.ico becomes an RT_ICON
#  entry, plus one RT_GROUP_ICON that ties them together.
#
#  Must run BEFORE the resource pack is appended (UpdateResource rebuilds the
#  exe structure).
#
#  Pure PowerShell. No Python required.
#
#  Usage:  pwsh -File host/seticon.ps1 [-ExePath <exe>] [-IcoPath <ico>]
# ============================================================================
[CmdletBinding()]
param(
    [string]$ExePath = '',
    [string]$IcoPath = ''
)

$ErrorActionPreference = 'Stop'

$hostDir = $PSScriptRoot
$projectDir = Split-Path $hostDir -Parent
if (-not $ExePath) { $ExePath = Join-Path $hostDir 'build\MIDI Player.exe' }
if (-not $IcoPath) { $IcoPath = Join-Path $projectDir 'icon.ico' }

if (-not (Test-Path $ExePath)) { throw "exe not found: $ExePath" }
if (-not (Test-Path $IcoPath)) { throw "ico not found: $IcoPath" }

# ---------------------------------------------------------------------------
# P/Invoke declarations
# ---------------------------------------------------------------------------
$signature = @'
using System;
using System.Runtime.InteropServices;

public static class ResourceUpdater
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr BeginUpdateResource(string pFileName, bool bDeleteExistingResources);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool UpdateResource(IntPtr hUpdate, IntPtr lpType, IntPtr lpName,
                                             ushort wLanguage, byte[] lpData, uint cbData);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool EndUpdateResource(IntPtr hUpdate, bool fDiscard);
}
'@
if (-not ('ResourceUpdater' -as [type])) {
    Add-Type -TypeDefinition $signature -Language CSharp
}

# ---------------------------------------------------------------------------
# Parse the ICO
# ---------------------------------------------------------------------------
$bytes = [System.IO.File]::ReadAllBytes($IcoPath)
$reserved = [BitConverter]::ToUInt16($bytes, 0)
$imageType = [BitConverter]::ToUInt16($bytes, 2)
$imageCount = [BitConverter]::ToUInt16($bytes, 4)
if ($reserved -ne 0 -or $imageType -ne 1) { throw 'not a valid ICO file' }

$images = @()
for ($i = 0; $i -lt $imageCount; $i++) {
    $entryOffset = 6 + $i * 16
    $width = [int]$bytes[$entryOffset]
    $height = [int]$bytes[$entryOffset + 1]
    $colors = [int]$bytes[$entryOffset + 2]
    $planes = [BitConverter]::ToUInt16($bytes, $entryOffset + 4)
    $bpp = [BitConverter]::ToUInt16($bytes, $entryOffset + 6)
    $size = [int][BitConverter]::ToUInt32($bytes, $entryOffset + 8)
    $dataOffset = [int][BitConverter]::ToUInt32($bytes, $entryOffset + 12)

    $data = New-Object byte[] $size
    [Array]::Copy($bytes, $dataOffset, $data, 0, $size)

    $images += [PSCustomObject]@{
        Width  = if ($width -eq 0) { 256 } else { $width }
        Height = if ($height -eq 0) { 256 } else { $height }
        Colors = $colors
        Planes = if ($planes -eq 0) { 1 } else { $planes }
        Bpp    = if ($bpp -eq 0) { 32 } else { $bpp }
        Size   = $size
        Data   = $data
    }
}

# ---------------------------------------------------------------------------
# Write the resources
# ---------------------------------------------------------------------------
$handle = [ResourceUpdater]::BeginUpdateResource((Resolve-Path $ExePath).Path, $false)
if ($handle -eq [IntPtr]::Zero) {
    throw "BeginUpdateResource failed (error $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
}

$succeeded = $true
try {
    $ids = @()
    for ($i = 0; $i -lt $images.Count; $i++) {
        $id = $i + 1
        $ids += $id
        $image = $images[$i]
        if (-not [ResourceUpdater]::UpdateResource($handle, [IntPtr]3, [IntPtr]$id, 0, $image.Data, [uint32]$image.Size)) {
            Write-Warning "RT_ICON $id failed"
            $succeeded = $false
            break
        }
    }

    if ($succeeded) {
        # GRPICONDIR: reserved(0) + type(1) + count + count x GRPICONDIRENTRY(14B)
        $group = [System.Collections.Generic.List[byte]]::new()
        $group.AddRange([BitConverter]::GetBytes([uint16]0))
        $group.AddRange([BitConverter]::GetBytes([uint16]1))
        $group.AddRange([BitConverter]::GetBytes([uint16]$images.Count))
        for ($i = 0; $i -lt $images.Count; $i++) {
            $image = $images[$i]
            $group.Add([byte]$(if ($image.Width -ge 256) { 0 } else { $image.Width }))
            $group.Add([byte]$(if ($image.Height -ge 256) { 0 } else { $image.Height }))
            $group.Add([byte]$image.Colors)
            $group.Add([byte]0)
            $group.AddRange([BitConverter]::GetBytes([uint16]$image.Planes))
            $group.AddRange([BitConverter]::GetBytes([uint16]$image.Bpp))
            $group.AddRange([BitConverter]::GetBytes([uint32]$image.Size))
            $group.AddRange([BitConverter]::GetBytes([uint16]$ids[$i]))
        }
        $groupData = $group.ToArray()
        if (-not [ResourceUpdater]::UpdateResource($handle, [IntPtr]14, [IntPtr]1, 0, $groupData, [uint32]$groupData.Length)) {
            Write-Warning 'RT_GROUP_ICON failed'
            $succeeded = $false
        }
    }
}
finally {
    if (-not [ResourceUpdater]::EndUpdateResource($handle, -not $succeeded)) {
        Write-Warning 'EndUpdateResource failed'
        $succeeded = $false
    }
}

if (-not $succeeded) { throw 'icon embedding failed' }
Write-Host ("Icon embedded: {0} sizes -> {1}" -f $images.Count, (Split-Path $ExePath -Leaf))
