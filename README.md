# Governança de Cadastros

Reimplementação do zero do MVP de saneamento e governança cadastral.

## Referências preservadas

- `Fase1.gs` — saneamento (planilha)
- `Fase2.gs` — matching e agrupamento (planilha)
- `Desenho_Funcional_MVP_Governanca_Cadastros.md`
- `desenho_funcional_ferramenta_saneamento_cadastros.md`

## Stack

- Frontend: Next.js 15 + TypeScript
- Backend: FastAPI + SQLAlchemy + Alembic
- Banco: PostgreSQL 18

## Subir ambiente

```bash
cp .env.example .env
docker compose up -d
cd backend && uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn governanca.main:app --reload --port 8000
```

Em outro terminal:

```bash
cd frontend && npm install && npm run dev
```

## Validação

```bash
cd backend && uv run pytest
cd frontend && npm run typecheck
```

## Fluxo MVP (Etapa 1)

Dashboard → Projeto → Importação → Saneamento (Fase 1) → Análises (Fase 2) → DE/PARA → Base Mestre

Princípios:

- Original importado imutável
- DE/PARA em vínculo separado
- Sem autenticação no MVP
