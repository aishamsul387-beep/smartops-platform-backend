$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
$controlRoot = "C:\Users\HP\OneDrive\Desktop\SmartOpsAI\mobile-app\_smartops_control"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$snapshotRoot = Join-Path $controlRoot "backend_hardening_milestone_$timestamp"
$backupRoot = Join-Path $snapshotRoot "backup"
$reportsRoot = Join-Path $snapshotRoot "reports"

function Ensure-Dir {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Write-Utf8NoBomFile {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir = Split-Path -Parent $Path
    Ensure-Dir $dir
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Copy-LightProject {
    param(
        [string]$SourcePath,
        [string]$DestinationPath
    )

    Ensure-Dir $DestinationPath

    $args = @(
        $SourcePath,
        $DestinationPath,
        "/E",
        "/R:1",
        "/W:1",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NP",
        "/XD", (Join-Path $SourcePath "node_modules"),
        "/XD", (Join-Path $SourcePath "dist"),
        "/XD", (Join-Path $SourcePath ".git"),
        "/XF", "*.log"
    )

    & robocopy @args | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "Robocopy failed with exit code $LASTEXITCODE"
    }
}

Ensure-Dir $controlRoot
Ensure-Dir $snapshotRoot
Ensure-Dir $backupRoot
Ensure-Dir $reportsRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host " SMARTOPS BACKEND HARDENING MILESTONE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host "Backend root : $backendRoot" -ForegroundColor Cyan
Write-Host "Snapshot root: $snapshotRoot" -ForegroundColor Cyan
Write-Host ""

Write-Host "Backing up backend..." -ForegroundColor Yellow
Copy-LightProject -SourcePath $backendRoot -DestinationPath (Join-Path $backupRoot "backend")

$notes = @"
SmartOps Backend Hardening Milestone
Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Included:
- request id middleware
- request logger
- security headers
- centralized error handler
- not-found middleware
- auth/session refresh prep
- shared response helpers
- validation helper rules
- inventory/orders validator prep
"@

Write-Utf8NoBomFile -Path (Join-Path $reportsRoot "backend-hardening-notes.txt") -Content $notes

cmd /c tree "$backendRoot\src" /F /A > (Join-Path $reportsRoot "backend-src-tree.txt")

Write-Host ""
Write-Host "Backend hardening milestone saved successfully." -ForegroundColor Green
Write-Host "Snapshot folder: $snapshotRoot" -ForegroundColor Cyan
