#!/usr/bin/env bash
# Desenvolvimento leve: só PostgreSQL no Docker; API e frontend no host.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
export PATH="${HOME}/.local/bin:${PATH}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Criado .env a partir de .env.example"
fi

if [[ ! -f frontend/.env.local ]]; then
  cp frontend/.env.example frontend/.env.local
  echo "Criado frontend/.env.local"
fi

pg_user="$(grep -E '^\s*POSTGRES_USER=' .env | cut -d= -f2- | tr -d '[:space:]')"
pg_db="$(grep -E '^\s*POSTGRES_DB=' .env | cut -d= -f2- | tr -d '[:space:]')"
pg_port="$(grep -E '^\s*POSTGRES_PORT=' .env | cut -d= -f2- | tr -d '[:space:]' || true)"
pg_port="${pg_port:-5432}"

echo "Subindo apenas PostgreSQL (sem build de backend/frontend)..."
docker compose up -d db

deadline=$((SECONDS + 120))
while true; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' governanca-cadastros-db 2>/dev/null || echo unknown)"
  if [[ "$status" == "healthy" ]]; then
    echo "PostgreSQL saudável em localhost:${pg_port}"
    break
  fi
  if (( SECONDS >= deadline )); then
    docker compose logs db --tail 30
    echo "PostgreSQL não ficou saudável a tempo (status: ${status})" >&2
    exit 1
  fi
  sleep 2
done

echo "Aplicando migrations..."
(
  cd backend
  uv sync --group dev --quiet
  uv run alembic upgrade head
)

if curl -sf "http://127.0.0.1:8000/health/live" >/dev/null 2>&1; then
  echo "Backend já em execução em http://127.0.0.1:8000"
else
  echo "Iniciando backend no host..."
  (
    cd backend
    nohup uv run uvicorn app.main:app --app-dir src --reload --host 127.0.0.1 --port 8000 \
      >"${REPO_ROOT}/.local-backend.log" 2>&1 &
    echo $! >"${REPO_ROOT}/.local-backend.pid"
  )
fi

if curl -sf "http://127.0.0.1:3000" >/dev/null 2>&1; then
  echo "Frontend já em execução em http://localhost:3000"
else
  echo "Iniciando frontend no host..."
  (
    cd frontend
    if [[ ! -d node_modules ]]; then
      npm install
    fi
    nohup npm run dev >"${REPO_ROOT}/.local-frontend.log" 2>&1 &
    echo $! >"${REPO_ROOT}/.local-frontend.pid"
  )
fi

echo ""
echo "Ambiente local (modo leve):"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://127.0.0.1:8000"
echo "  Logs:     .local-backend.log / .local-frontend.log"
echo "  Parar:    ./scripts/parar-local.sh"
