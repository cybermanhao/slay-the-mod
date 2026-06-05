# STS2 Mod Agent — One-time setup script
# Run from repo root: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }

# ── 1. Prerequisites check ──────────────────────────────────────────────────

Step "Checking prerequisites"

$missing = @()
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { $missing += "dotnet (https://dotnet.microsoft.com)" }
if (-not (Get-Command node   -ErrorAction SilentlyContinue)) { $missing += "node (https://nodejs.org)" }
if (-not (Get-Command pnpm   -ErrorAction SilentlyContinue)) { $missing += "pnpm  (npm install -g pnpm)" }

if ($missing.Count -gt 0) {
    Write-Host "`n  Missing prerequisites:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    exit 1
}
Ok ".NET $(& dotnet --version)  |  Node $(& node --version)  |  pnpm $(& pnpm --version)"

# ── 2. Download GDRE Tools ───────────────────────────────────────────────────

Step "GDRE Tools (Godot RE Tools)"
& "$PSScriptRoot\download-tools.ps1"

# ── 3. Node packages ─────────────────────────────────────────────────────────

Step "Installing Node packages (sts2-mcp-server)"
$mcpDir = Join-Path $root "packages\sts2-mcp-server"
if (Test-Path $mcpDir) {
    Push-Location $mcpDir
    pnpm install
    Pop-Location
    Ok "pnpm install done"
} else {
    Warn "packages/sts2-mcp-server not found, skipping"
}

# ── 4. .NET restore ──────────────────────────────────────────────────────────

Step "Restoring .NET projects"
foreach ($mod in Get-ChildItem (Join-Path $root "mods") -Directory) {
    $csproj = Get-ChildItem $mod.FullName -Filter "*.csproj" -Recurse | Select-Object -First 1
    if ($csproj) {
        Write-Host "    dotnet restore $($mod.Name)"
        dotnet restore $csproj.FullName --nologo -v q
    }
}
Ok ".NET restore done"

# ── Done ─────────────────────────────────────────────────────────────────────

Write-Host "`nSetup complete." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  - Build a mod:   cd mods\<ModName>  &&  dotnet build"
Write-Host "  - Run MCP:       cd packages\sts2-mcp-server  &&  pnpm dev"
