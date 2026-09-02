# Padrão de Desenvolvimento — Governança de Cadastros

**Versão:** 0.1

**Stack canônica:** Next.js + TypeScript · FastAPI + Python · PostgreSQL 18 · REST · Docker Compose

Este diretório é o contrato de construção do projeto. Ele adapta os princípios reutilizáveis do kit da Torre de Controle sem herdar sua stack, seus módulos, suas métricas ou suas decisões operacionais.

## Fontes canônicas

| Assunto | Documento |
|---|---|
| Escopo, execução e entrega | [00-processo.md](00-processo.md) |
| Linguagens, contratos e dependências | [01-linguagem.md](01-linguagem.md) |
| Estrutura de frontend e backend | [02-arquitetura.md](02-arquitetura.md) |
| Interface e acessibilidade | [03-layout-padrao.md](03-layout-padrao.md) |
| Segurança | [04-seguranca.md](04-seguranca.md) |
| Papéis e isolamento organizacional | [06-modelo-acesso.md](06-modelo-acesso.md) |
| Modelagem PostgreSQL | [07-esquema-postgresql.md](07-esquema-postgresql.md) |
| Gates e testes | [08-validacao-automatizada.md](08-validacao-automatizada.md) |
| Classificação de vulnerabilidades | [10-severidade-seguranca.md](10-severidade-seguranca.md) |
| Exceções de segurança aprovadas | [11-riscos-aceitos.md](11-riscos-aceitos.md) |
| Checklist de release | [12-checklist-release-seguranca.md](12-checklist-release-seguranca.md) |
| Migrations | [14-migracoes-postgresql.md](14-migracoes-postgresql.md) |
| Datas e fuso horário | [15-fuso-horario.md](15-fuso-horario.md) |
| Lookups entre módulos | [16-lookups-cross-modulo.md](16-lookups-cross-modulo.md) |
| Commits e releases | [17-commits-changelog-releases.md](17-commits-changelog-releases.md) |

## Hierarquia documental

1. [decisoes-projeto.md](../decisoes-projeto.md) registra decisões homologadas.
2. [modelo-dados-v0.1.md](../modelo-dados-v0.1.md) especifica o modelo físico.
3. [arquitetura-tecnica-v0.1.md](../arquitetura-tecnica-v0.1.md) define a solução técnica.
4. Este diretório define como implementar e validar.

Em caso de conflito, não escolher silenciosamente. Interromper a alteração estrutural, registrar a divergência e solicitar decisão.

## O que não pertence a este padrão

- backlog ou tarefas pontuais;
- números de baseline de outro projeto;
- exemplos da Torre, Foods, filiais ou rotas;
- orientações de Vite, Express, MySQL ou Nginx específicas do sistema de origem;
- segredos, usuários de teste ou dados reais.
