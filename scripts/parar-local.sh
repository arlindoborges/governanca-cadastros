#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

stop_pid_file() {
  local file="$1"
  local label="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "Parado ${label} (PID ${pid})"
    fi
    rm -f "$file"
  fi
}

stop_pid_file ".local-backend.pid" "backend"
stop_pid_file ".local-frontend.pid" "frontend"

echo "Parando PostgreSQL do projeto..."
docker compose stop db

echo "Concluído."
