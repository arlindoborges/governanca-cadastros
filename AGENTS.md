# Agentes — Governança de Cadastros

## Fontes canônicas

Antes de alterar código, ler [`docs/padrao/README.md`](docs/padrao/README.md) e os documentos indicados para o escopo. Decisões homologadas ficam em [`docs/decisoes-projeto.md`](docs/decisoes-projeto.md).

## Invariantes

- Stack: Next.js/TypeScript, FastAPI/Python e PostgreSQL 18.
- Arquitetura: monorepo com backend monolítico modular e REST `/api/v1`.
- Regras de negócio e autorização pertencem ao backend.
- Toda operação tenant-owned valida a organização no backend.
- Preservar mudanças preexistentes e manter o diff restrito ao escopo.
- Não alterar contrato, arquitetura ou modelo físico sem decisão registrada.
- Não adicionar fila, Redis, object storage, `pgvector` ou microserviço preventivamente.
- Não copiar stack, módulos, baselines ou dados da Torre.

## Validação

Aplicar [`docs/padrao/08-validacao-automatizada.md`](docs/padrao/08-validacao-automatizada.md). Informar no final os comandos executados, resultados e limitações.

Commits, push, merge, tags e deploy exigem autorização explícita do usuário.

