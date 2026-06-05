# Download GDRE Tools (Godot RE Tools) for decompiling STS2 assets
# Repo: https://github.com/bruvzg/gdsdecomp

param(
    [string]$Version = "v2.5.0-beta.2"
)

$toolsDir = Join-Path $PSScriptRoot "..\tools"
$archiveName = "GDRE_tools-$Version-windows"
$destDir = Join-Path $toolsDir $archiveName

if (Test-Path (Join-Path $destDir "$archiveName\gdre_tools.exe")) {
    Write-Host "[GDRE] Already installed at $destDir" -ForegroundColor Green
    exit 0
}

$url = "https://github.com/bruvzg/gdsdecomp/releases/download/$Version/$archiveName.zip"
$zipPath = Join-Path $env:TEMP "$archiveName.zip"

Write-Host "[GDRE] Downloading $Version from GitHub releases..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
} catch {
    Write-Error "[GDRE] Download failed: $_"
    exit 1
}

Write-Host "[GDRE] Extracting to $destDir..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force $destDir | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $destDir -Force
Remove-Item $zipPath

$exe = Join-Path $destDir "$archiveName\gdre_tools.exe"
if (Test-Path $exe) {
    Write-Host "[GDRE] Done. Executable: $exe" -ForegroundColor Green
} else {
    Write-Error "[GDRE] Extraction succeeded but gdre_tools.exe not found at expected path."
    exit 1
}
