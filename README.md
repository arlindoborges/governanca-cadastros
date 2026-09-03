# Governança de Cadastros

MVP de uma aplicação web configurável para saneamento e governança de cadastros de produtos.

## Arquitetura planejada

- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Banco de dados: PostgreSQL
- Ambiente local: Docker Compose
- Estilo: monorepo com monólito modular

A definição completa está em [docs/arquitetura-tecnica-v0.1.md](docs/arquitetura-tecnica-v0.1.md).

O índice da documentação e o contrato de desenvolvimento estão em:

- [docs/README.md](docs/README.md)
- [PADRAO_PROJETO.md](PADRAO_PROJETO.md)

O projeto concluiu a Fatia 4 (Matching lexical). O Compose sobe PostgreSQL, FastAPI e Next.js; em desenvolvimento o código das apps também pode rodar nos servidores do host.

## Ambiente local

Pré-requisitos no Windows:

- Docker Desktop
- Node.js 24 LTS
- Python 3.12 (`py -3.12`)
- [uv](https://docs.astral.sh/uv/) no `PATH` (`%USERPROFILE%\.local\bin`)
- Git

```powershell
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
Copy-Item .env.example .env   # somente na primeira vez; ajuste POSTGRES_PORT se 5432 estiver ocupada
.\scripts\iniciar-db.ps1

cd backend
uv sync --group dev
uv run alembic upgrade head
cd ..
docker compose up -d
```

Abrir `http://localhost:3000`. O sistema abre no Início, sem login. Em **Importações** envie e mapeie CSV; em **Análises** execute normalização e matching do lote.

Para validar a Fatia 2:

```powershell
.\scripts\validar-fatia2.ps1
```

Para validar backend da Fatia 3 (após migration):

```powershell
cd backend
uv run alembic upgrade head
uv run pytest
```

Para validar backend da Fatia 4 (matching):

```powershell
cd backend
uv run alembic upgrade head
uv run pytest tests/unit/test_matching_engine.py tests/integration/test_matching.py
```

Se a porta 5432 já estiver ocupada (por exemplo o serviço Windows `postgresql-x64-18`), altere `POSTGRES_PORT` e a porta de `DATABASE_URL` no `.env`. A porta publicada é configurável; 5432 permanece o padrão da DP-010.
