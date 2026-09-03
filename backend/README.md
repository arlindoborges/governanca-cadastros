# Backend

API FastAPI do MVP de Governança de Cadastros.

Tecnologia: FastAPI + Python 3.12, SQLAlchemy 2, Alembic e PostgreSQL 18.

```powershell
uv sync --group dev
uv run alembic upgrade head
uv run uvicorn app.main:app --app-dir src --reload --host 127.0.0.1 --port 8000
```

Health: `GET /health/live` e `GET /health/ready`.
Fundação local: `GET /api/v1/foundation` (somente com `APP_ENV=local` ou `test`).
Importações: `GET/POST /api/v1/imports/batches` e exclusão por lote.

A imagem Docker está em `Dockerfile`. No Compose, o serviço `backend` usa essa imagem com reload e o código montado em volume.
