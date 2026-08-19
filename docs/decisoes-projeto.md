# Decisões de Projeto

**Data:** 18 de agosto de 2026

## Decisões homologadas

- **DP-001** — MVP 0.1 será o primeiro fluxo vertical completo do Modo 1, da importação à exportação, incluindo decisão humana, Produto Mestre, DE/PARA e auditoria.
- **DP-002** — Stack: Next.js + TypeScript no frontend, FastAPI + Python no backend e PostgreSQL como banco principal; pgvector somente quando a similaridade semântica for introduzida.
- **DP-003** — Arquitetura do MVP será monólito modular, sem microserviços.
- **DP-004** — Obrigatoriedade, relevância para SKU e bloqueio de equivalência serão configuráveis por atributo e contexto/categoria.
- **DP-005** — Desenvolvimento será assistido por IA, com arquitetura, regras, escopo e validações definidos antes da implementação.
- **DP-006** — Ambiente local não dependerá de XAMPP; Next.js e FastAPI usarão seus próprios servidores e PostgreSQL será o banco local.
- **DP-007** — Decisões, critérios de aceite e prompts serão definidos antes da implementação; agentes de IA serão usados como executores controlados.
- **DP-008** — Preparação do ambiente de desenvolvimento precede o desenvolvimento funcional.
- **DP-009** — Node.js 24 LTS é a versão de referência do ambiente local.
- **DP-010** — PostgreSQL 18 será usado como banco local, inicialmente na porta 5432.
- **DP-011** — Cursor é o editor principal; VS Code permanece como alternativa; Cursor AI e Codex poderão ser utilizados, um agente por tarefa.
- **DP-012** — O Cursor será mantido com conjunto mínimo de extensões, adicionando novas somente por necessidade técnica.
- **DP-013** — Todo código-fonte será controlado por Git desde o início; repositório inicialmente local.
- **DP-014** — A branch principal do repositório é `main`.
- **DP-015** — O projeto será organizado inicialmente como monorepo com `frontend`, `backend`, `docs` e `data`; dados reais/sensíveis não serão versionados.
