#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="${HOME}/.local/bin:${PATH}"

[[ -f .env ]] || cp .env.example .env
[[ -f frontend/.env.local ]] || cp frontend/.env.example frontend/.env.local

cd "${ROOT}/backend"
uv sync --extra dev

cd "${ROOT}/frontend"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
