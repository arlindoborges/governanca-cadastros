$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$envExample = Join-Path $repoRoot ".env.example"
$envFile = Join-Path $repoRoot ".env"

if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envExample)) {
        throw ".env.example nao encontrado"
    }
    Copy-Item $envExample $envFile
    Write-Host "Criado .env a partir de .env.example"
}

$pgUser = $null
$pgDb = $null
$pgPort = "5432"
foreach ($line in Get-Content $envFile) {
    if ($line -match "^\s*POSTGRES_USER=(.+)$") { $pgUser = $Matches[1].Trim() }
    if ($line -match "^\s*POSTGRES_DB=(.+)$") { $pgDb = $Matches[1].Trim() }
    if ($line -match "^\s*POSTGRES_PORT=(.+)$") { $pgPort = $Matches[1].Trim() }
}
if (-not $pgUser -or -not $pgDb) {
    throw "POSTGRES_USER ou POSTGRES_DB ausente em .env"
}

$listeningPids = @()
netstat -ano | Select-String ":$pgPort\s+.+\s+LISTENING" | ForEach-Object {
    if ($_.Line -match "(\d+)\s*$") {
        $listeningPids += [int]$Matches[1]
    }
}
$listeningPids = $listeningPids | Select-Object -Unique

$ourContainer = docker ps -a --filter "name=governanca-cadastros-db" --format "{{.ID}}" 2>$null
$ourPublished = $false
if ($ourContainer) {
    $mapped = docker port governanca-cadastros-db 5432/tcp 2>$null
    if ($mapped -match ":$pgPort$") {
        $ourPublished = $true
    }
}

if ($listeningPids.Count -gt 0 -and -not $ourPublished) {
    $owners = @()
    foreach ($procId in $listeningPids) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) { $owners += "$($proc.Name) (PID $procId)" } else { $owners += "PID $procId" }
    }
    $native = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
    $hint = "Defina POSTGRES_PORT e a porta de DATABASE_URL no .env para um valor livre, por exemplo 5433."
    if ($native -and $native.Status -eq "Running") {
        $hint = "Este Windows ja possui o servico postgresql-x64-18 na porta 5432. $hint"
    }
    throw "Porta $pgPort ja esta em uso ($($owners -join ', ')). $hint"
}

Write-Host "Subindo PostgreSQL 18 na porta $pgPort..."
docker compose up -d db

$deadline = (Get-Date).AddMinutes(2)
do {
    $status = docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" governanca-cadastros-db 2>$null
    if ($status -eq "healthy") {
        Write-Host "PostgreSQL saudavel."
        docker compose exec -T db psql -U $pgUser -d $pgDb -c "SELECT current_database(), current_user, version();"
        Write-Host "Host: localhost:${pgPort}"
        exit 0
    }
    if ((Get-Date) -ge $deadline) {
        docker compose logs db --tail 50
        throw "PostgreSQL nao ficou saudavel em 2 minutos. Status: $status"
    }
    Start-Sleep -Seconds 3
} while ($true)
