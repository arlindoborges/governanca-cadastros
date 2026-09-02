$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$localBin = Join-Path $env:USERPROFILE ".local\bin"
if (Test-Path $localBin) {
    $env:Path = "$localBin;$env:Path"
}

$failures = @()

function Test-MajorVersion {
    param(
        [string]$Label,
        [string]$RawVersion,
        [int]$ExpectedMajor
    )
    if ($RawVersion -match "(\d+)") {
        $major = [int]$Matches[1]
        if ($major -eq $ExpectedMajor) {
            Write-Host "OK  $Label $RawVersion"
            return
        }
    }
    $script:failures += "${Label}: esperado major $ExpectedMajor, obtido '$RawVersion'"
    Write-Host "FALHA  $Label $RawVersion"
}

Write-Host "Verificando ferramentas da Fatia 1..."
Write-Host ""

try {
    $dockerVersion = docker --version
    Write-Host "OK  $dockerVersion"
} catch {
    $failures += "Docker CLI nao encontrado"
    Write-Host "FALHA  Docker CLI nao encontrado"
}

try {
    $composeVersion = docker compose version
    Write-Host "OK  $composeVersion"
} catch {
    $failures += "Docker Compose nao encontrado"
    Write-Host "FALHA  Docker Compose nao encontrado"
}

try {
    docker info | Out-Null
    Write-Host "OK  Docker daemon em execucao"
} catch {
    $failures += "Docker daemon nao esta em execucao. Abra o Docker Desktop e tente de novo."
    Write-Host "FALHA  Docker daemon nao esta em execucao"
}

try {
    $nodeVersion = node --version
    Test-MajorVersion -Label "Node.js" -RawVersion $nodeVersion -ExpectedMajor 24
} catch {
    $failures += "Node.js nao encontrado"
    Write-Host "FALHA  Node.js nao encontrado"
}

try {
    $npmVersion = npm --version
    Write-Host "OK  npm $npmVersion"
} catch {
    $failures += "npm nao encontrado"
    Write-Host "FALHA  npm nao encontrado"
}

try {
    $pythonVersion = (& py -3.12 --version).Trim()
    if ($pythonVersion -match "3\.12") {
        Write-Host "OK  $pythonVersion"
    } else {
        $failures += "Python 3.12 nao encontrado via py -3.12"
        Write-Host "FALHA  $pythonVersion"
    }
} catch {
    $failures += "Python 3.12 nao encontrado via py -3.12"
    Write-Host "FALHA  Python 3.12 nao encontrado"
}

try {
    $uvVersion = uv --version
    Write-Host "OK  $uvVersion"
} catch {
    $failures += "uv nao encontrado. Instale com: irm https://astral.sh/uv/install.ps1 | iex"
    Write-Host "FALHA  uv nao encontrado"
}

try {
    $gitVersion = git --version
    Write-Host "OK  $gitVersion"
} catch {
    $failures += "Git nao encontrado"
    Write-Host "FALHA  Git nao encontrado"
}

$envExample = Join-Path $repoRoot ".env.example"
$envFile = Join-Path $repoRoot ".env"
if (Test-Path $envExample) {
    Write-Host "OK  .env.example presente"
} else {
    $failures += ".env.example ausente"
    Write-Host "FALHA  .env.example ausente"
}

if (Test-Path $envFile) {
    Write-Host "OK  .env presente"
} else {
    Write-Host "AVISO  .env ausente. Copie .env.example para .env antes de subir o banco."
}

Write-Host ""
if ($failures.Count -gt 0) {
    Write-Host "Ambiente incompleto:"
    $failures | ForEach-Object { Write-Host " - $_" }
    exit 1
}

Write-Host "Ambiente pronto para o PostgreSQL local."
exit 0
