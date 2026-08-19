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
- **DP-016** — A estrutura-base do repositório foi homologada no commit `6d67134` e representa o primeiro baseline técnico recuperável do MVP.
- **DP-017** — O MVP 0.1 terá mapeamento de colunas na importação; código, descrição e unidade serão os campos mínimos obrigatórios.
- **DP-018** — O resultado da comparação e o estado da decisão humana serão conceitos independentes no modelo de dados.
- **DP-019** — O Modo 2 permanece requisito obrigatório do MVP global, mas será desenvolvido após a validação do núcleo compartilhado pelo Modo 1.
- **DP-020** — O backend será organizado como monólito modular, com responsabilidades independentes para importação, normalização, governança, matching, decisão humana, dados mestres, auditoria e exportação.
- **DP-021** — IA não será um componente soberano de decisão; técnicas de IA serão utilizadas nas etapas em que agregarem valor, mantendo regras determinísticas e decisão humana separadas.
- **DP-022** — O MVP 0.1 iniciará com processamento simples/síncrono quando tecnicamente viável; filas, workers e processamento distribuído somente serão adicionados mediante necessidade comprovada.
- **DP-023** — A segregação por organização/tenant fará parte do modelo desde a primeira versão, mesmo que o MVP 0.1 opere inicialmente com apenas uma organização de teste.
- **DP-024** — Campos mínimos e estruturais dos registros importados serão relacionais; campos adicionais das bases de origem poderão ser preservados em PostgreSQL `JSONB`.
- **DP-025** — O Perfil de Governança será versionável; análises e decisões deverão poder referenciar a versão utilizada.
- **DP-026** — A classificação será hierárquica e genérica, baseada em nós pai/filho, sem estrutura física rígida para Grupo, Subgrupo e Classe.
- **DP-027** — Os componentes e evidências do matching serão armazenados separadamente; o sistema não dependerá exclusivamente de um score agregado.
- **DP-028** — `JSONB` será utilizado seletivamente para dados variáveis e preservação de origem/auditoria; o núcleo da governança permanecerá relacional.
- **DP-029** — `MATCH_CANDIDATE` utilizará referências explícitas e mutuamente exclusivas para candidato de registro de origem ou Produto Mestre, evitando foreign key polimórfica genérica.
- **DP-030** — Decisões de saneamento serão históricas e não sobrescritas; um matching poderá possuir múltiplas decisões ao longo do tempo.
- **DP-031** — Entidades principais utilizarão UUID como chave primária interna; códigos amigáveis de negócio serão armazenados separadamente.
- **DP-032** — Entidades de governança e dados mestres utilizarão inativação lógica como padrão; exclusão física será restrita a situações técnicas controladas.
- **DP-033** — Ao concluir cada bloco relevante de arquitetura/especificação, as decisões homologadas serão registradas no repositório antes do próximo bloco de implementação.
