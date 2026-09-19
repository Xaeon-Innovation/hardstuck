# Dump HardStuck Postgres from docker compose (Windows).
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "backups"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
$Out = Join-Path $OutDir "hardstuck-$Stamp.sql"
docker exec hardstuck-postgres pg_dump -U hardstuck -d hardstuck | Set-Content -Path $Out -Encoding utf8
Write-Host "Wrote $Out"
