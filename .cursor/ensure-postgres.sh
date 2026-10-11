#!/usr/bin/env bash
# Postgres local quando Docker/Compose não está disponível (ex.: alguns Cloud Agents).
set -euo pipefail

pg_ready() {
  command -v pg_isready >/dev/null 2>&1 && pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null
}

if pg_ready; then
  exit 0
fi

if command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo pg_ctlcluster 16 main start 2>/dev/null || true
fi

if ! pg_ready; then
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=0 <<'SQL'
DO $$ BEGIN
  CREATE USER governanca WITH PASSWORD 'governanca_local_dev';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
SELECT 'CREATE DATABASE governanca_cadastros OWNER governanca'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'governanca_cadastros')\gexec
GRANT ALL PRIVILEGES ON DATABASE governanca_cadastros TO governanca;
SQL
