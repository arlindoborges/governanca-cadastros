$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"

function Wait-HttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 90
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                return
            }
        } catch {
            if ((Get-Date) -ge $deadline) {
                throw "Timeout aguardando $Url"
            }
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
}

Write-Host "== Ambiente =="
& (Join-Path $PSScriptRoot "verificar-ambiente.ps1")

Write-Host "== PostgreSQL =="
& (Join-Path $PSScriptRoot "iniciar-db.ps1")

Write-Host "== Compose config =="
docker compose config --quiet

Write-Host "== Backend: lint, testes e migration =="
Set-Location (Join-Path $repoRoot "backend")
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run pytest

Write-Host "== OpenAPI =="
Set-Location $repoRoot
uv run --project backend python scripts/export_openapi.py

Write-Host "== Frontend: lint, typecheck e build =="
Set-Location (Join-Path $repoRoot "frontend")
npm run generate:api
npm run lint
npm run typecheck
npm run build

Write-Host "== Servicos de aplicacao =="
$apiUp = $false
$webUp = $false
try {
    $live = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health/live" -UseBasicParsing -TimeoutSec 3
    $apiUp = $live.StatusCode -eq 200
} catch { $apiUp = $false }
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
    $webUp = $frontend.StatusCode -eq 200
} catch { $webUp = $false }

if (-not $apiUp -or -not $webUp) {
    Write-Host "Subindo backend e frontend no Compose..."
    Set-Location $repoRoot
    docker compose up -d backend frontend
    Wait-HttpOk -Url "http://127.0.0.1:8000/health/ready" -TimeoutSeconds 120
    Wait-HttpOk -Url "http://localhost:3000" -TimeoutSeconds 120
} else {
    Write-Host "Reusando API e frontend ja em execucao no host."
}

Write-Host "== E2E Importacoes =="
Set-Location (Join-Path $repoRoot "frontend")
npx playwright install chromium
$env:PLAYWRIGHT_SKIP_WEBSERVER = "1"
npm run test:e2e

Write-Host "Fatia 2 validada."
