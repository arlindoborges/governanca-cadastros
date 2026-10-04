#!/usr/bin/env bash
# Sobe Postgres (Compose), backend e frontend para desenvolvimento local.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Criado .env a partir de .env.example"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado. Instale Docker Desktop ou Colima antes de continuar."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "docker compose não disponível."
  exit 1
fi

"${COMPOSE[@]}" up -d

if ! command -v uv >/dev/null 2>&1; then
  echo "uv não encontrado. Instale: https://docs.astral.sh/uv/"
  exit 1
fi

cd "$ROOT/backend"
uv sync --extra dev
uv run alembic upgrade head

if [[ ! -f "$ROOT/frontend/.env.local" ]]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env.local"
fi

echo ""
echo "Backend:  cd backend && uv run uvicorn governanca.main:app --reload --port 8000"
echo "Frontend: cd frontend && npm install && npm run dev"
echo "API:      http://127.0.0.1:8000/docs  |  App: http://localhost:3000"
