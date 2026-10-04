#!/usr/bin/env bash
# Sobe Postgres, backend e frontend em cada boot do Cloud Agent (idempotente).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="${HOME}/.local/bin:${PATH}"
TMUX=(tmux -f /exec-daemon/tmux.portal.conf)

if [[ -d "${HOME}/.nvm/versions/node" ]]; then
  NVM_NODE="$(find "${HOME}/.nvm/versions/node" -maxdepth 2 -type d -name bin 2>/dev/null | sort -V | tail -1)"
  if [[ -n "${NVM_NODE}" ]]; then
    export PATH="${NVM_NODE}:${PATH}"
  fi
fi

[[ -f .env ]] || cp .env.example .env
[[ -f frontend/.env.local ]] || cp frontend/.env.example frontend/.env.local

ensure_docker() {
  command -v docker >/dev/null 2>&1 || return 0
  if ! docker info >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1; then
      sudo dockerd >/tmp/dockerd.log 2>&1 &
    else
      dockerd >/tmp/dockerd.log 2>&1 &
    fi
    for _ in $(seq 1 45); do
      docker info >/dev/null 2>&1 && break
      sleep 1
    done
  fi
  compose_up() {
    if docker compose version >/dev/null 2>&1; then
      docker compose up -d db "$@" 2>/dev/null && return 0
      sudo docker compose up -d db "$@" 2>/dev/null && return 0
    fi
    if command -v docker-compose >/dev/null 2>&1; then
      docker-compose up -d db "$@" 2>/dev/null && return 0
      sudo docker-compose up -d db "$@" 2>/dev/null && return 0
    fi
    return 1
  }
  compose_up || true
}

wait_postgres() {
  command -v docker >/dev/null 2>&1 || return 0
  for _ in $(seq 1 60); do
    if docker compose exec -T db pg_isready -U governanca -d governanca_cadastros >/dev/null 2>&1; then
      return 0
    fi
    if sudo docker compose exec -T db pg_isready -U governanca -d governanca_cadastros >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

start_tmux_if_down() {
  local name="$1"
  local workdir="$2"
  local command="$3"
  if "${TMUX[@]}" has-session -t "=${name}" 2>/dev/null; then
    return 0
  fi
  "${TMUX[@]}" new-session -d -s "${name}" -c "${workdir}" -- bash -l -c "${command}"
}

http_ok() {
  curl -sf --max-time 2 "$1" >/dev/null 2>&1
}

ensure_docker
wait_postgres || true

if command -v uv >/dev/null 2>&1; then
  cd "${ROOT}/backend"
  uv run alembic upgrade head >/tmp/cursor-alembic.log 2>&1 || true
fi

if ! http_ok "http://127.0.0.1:8000/docs"; then
  start_tmux_if_down fastapi-backend "${ROOT}/backend" \
    'export PATH="$HOME/.local/bin:$PATH" && uv run uvicorn governanca.main:app --reload --host 0.0.0.0 --port 8000'
fi

if ! http_ok "http://127.0.0.1:3000/"; then
  start_tmux_if_down next-dev-server "${ROOT}/frontend" \
    'export PATH="$HOME/.local/bin:$PATH"; NVM_NODE=$(find "$HOME/.nvm/versions/node" -maxdepth 2 -type d -name bin 2>/dev/null | sort -V | tail -1); [[ -n "$NVM_NODE" ]] && export PATH="$NVM_NODE:$PATH"; npm run dev'
fi
