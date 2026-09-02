# Arquitetura Técnica v0.1

**Status:** proposta recomendada para implementação  
**Base:** decisões DP-001 a DP-116 e `modelo-dados-v0.1.md`  
**Escopo:** MVP 0.1 do Modo 1

O processo e os padrões de implementação desta arquitetura estão em [`docs/padrao/`](padrao/README.md).

## 1. Decisão executiva

O projeto deve ser implementado como um **monorepo com monólito modular**, composto por:

- uma aplicação web **Next.js + TypeScript**;
- uma API **FastAPI + Python**;
- um banco **PostgreSQL 18**;
- **Docker Compose** para padronizar o ambiente local;
- imagens Docker independentes para frontend e backend;
- processamento síncrono no início, com estados persistidos que permitam introduzir worker posteriormente sem redesenhar o domínio.

Não devem entrar no MVP inicial: microserviços, Kubernetes, Redis, Celery, Kafka, Elasticsearch, banco vetorial separado, API Gateway dedicado ou data warehouse.

```text
Navegador
   |
   v
Next.js (interface e composição de telas)
   |
   | REST /api/v1
   v
FastAPI (autorização, casos de uso e regras de negócio)
   |
   +---- PostgreSQL (estado, linhagem, auditoria e configurações)
   |
   +---- diretório temporário (arquivo durante importação/exportação)
```

O frontend nunca acessa o PostgreSQL. Toda regra de governança, matching, autorização, decisão e consolidação pertence ao backend.

## 2. Topologia por ambiente

### Desenvolvimento local

O `compose.yaml` na raiz deve oferecer três serviços:

1. `db`: PostgreSQL 18, volume nomeado, healthcheck e porta local configurável;
2. `backend`: FastAPI com reload, migration executada explicitamente e healthcheck;
3. `frontend`: Next.js em modo de desenvolvimento, consumindo a URL interna/pública configurada da API.

O código pode ser montado como volume no modo de desenvolvimento. Dependências devem permanecer em volumes próprios ou dentro dos containers para evitar incompatibilidade entre Windows e Linux.

### Testes e CI

- backend e frontend executam verificações em jobs separados;
- testes de integração usam uma instância PostgreSQL descartável;
- migration é aplicada do zero antes dos testes de integração;
- o build das duas imagens comprova que o mesmo artefato pode ser implantado;
- nenhuma base real ou arquivo sensível entra no repositório.

### Produção

Usar as mesmas imagens imutáveis do frontend e backend, com:

- TLS e roteamento fornecidos pela plataforma/ingress;
- PostgreSQL gerenciado ou instância dedicada com backup automático;
- segredos injetados pelo ambiente, nunca incluídos na imagem;
- pelo menos uma réplica de cada aplicação no início;
- migrations como etapa única de release, antes da troca de tráfego;
- arquivos de importação processados temporariamente e descartados após persistir os registros e a linhagem necessários.

Docker Compose é a referência para desenvolvimento, não uma exigência de orquestração em produção. Kubernetes não se justifica para o MVP.

## 3. Estrutura recomendada do monorepo

```text
governanca-cadastros/
|-- compose.yaml
|-- .env.example
|-- Makefile                         # ou scripts PowerShell equivalentes
|-- README.md
|-- docs/
|   |-- arquitetura-tecnica-v0.1.md
|   |-- decisoes-projeto.md
|   |-- modelo-dados-v0.1.md
|   `-- adr/                         # novas decisões arquiteturais relevantes
|-- backend/
|   |-- pyproject.toml
|   |-- uv.lock
|   |-- Dockerfile
|   |-- alembic.ini
|   |-- migrations/
|   |-- src/app/
|   |   |-- main.py
|   |   |-- core/
|   |   |-- organizations/
|   |   |-- imports/
|   |   |-- governance/
|   |   |-- normalization/
|   |   |-- matching/
|   |   |-- reviews/
|   |   |-- master_data/
|   |   |-- audit/
|   |   `-- exports/
|   `-- tests/
|       |-- unit/
|       |-- integration/
|       `-- contract/
|-- frontend/
|   |-- package.json
|   |-- package-lock.json
|   |-- Dockerfile
|   |-- src/
|   |   |-- app/
|   |   |-- features/
|   |   |-- components/
|   |   |-- lib/
|   |   `-- generated/
|   `-- tests/
`-- data/
    `-- README.md
```

`data/` é apenas para amostras locais não sensíveis e continua ignorada pelo Git.

## 4. Backend

### Tecnologias

- FastAPI;
- Pydantic e `pydantic-settings` para contratos e configuração;
- SQLAlchemy 2 como ORM;
- Psycopg 3 como driver PostgreSQL;
- Alembic para migrations;
- `uv` para ambiente, dependências e lockfile;
- Ruff para lint e formatação;
- Pytest para testes.

A primeira implementação deve usar acesso síncrono ao banco. O fluxo é predominantemente transacional e de processamento; adicionar `async` em toda a persistência elevaria a complexidade sem benefício demonstrado. Isso não impede endpoints assíncronos específicos no futuro.

### Organização de cada módulo

Cada módulo funcional deve conter apenas os elementos que realmente utilizar:

```text
imports/
|-- router.py       # HTTP, autenticação, parâmetros e códigos de resposta
|-- schemas.py      # contratos de entrada e saída
|-- service.py      # casos de uso e transações
|-- models.py       # modelos SQLAlchemy pertencentes ao módulo
|-- repository.py  # consultas não triviais e sempre tenant-scoped
`-- errors.py       # erros funcionais estáveis, quando necessários
```

Não é obrigatório criar todos esses arquivos antecipadamente. O objetivo é separar transporte, caso de uso e persistência sem criar uma arquitetura abstrata excessiva.

### Responsabilidades dos módulos

- `core`: configuração, conexão e sessão do banco, contexto da requisição, segurança, erros, logging e utilitários estritamente compartilhados;
- `organizations`: organizações, usuários, vínculos, papéis e contexto do tenant;
- `imports`: sistemas de origem, upload, hash, lote, mapeamento de colunas, parsing, validação estrutural e snapshots brutos;
- `governance`: perfis versionados, taxonomia, atributos e regras parametrizadas;
- `normalization`: regras determinísticas, interpretação e atributos derivados, sem alterar o dado bruto;
- `matching`: execuções, resultados, candidatos, scores e evidências;
- `reviews`: pendências e decisões humanas históricas;
- `master_data`: Produto Mestre, atributos, DE/PARA, conversões e realização transacional das decisões;
- `audit`: gravação append-only de eventos de negócio e consultas de rastreabilidade;
- `exports`: geração sob demanda de resultados, sem catálogo persistente de arquivos exportados.

### Fronteiras e dependências

O fluxo permitido é:

```text
router -> service -> repository/model -> PostgreSQL
                    |
                    `-> audit na mesma transação de negócio
```

- routers não implementam regra de negócio;
- módulos não acessam tabelas de outros módulos por consultas improvisadas; usam um serviço público ou uma consulta de leitura explicitamente compartilhada;
- matching pode consultar normalização, governança e dados mestres;
- reviews realiza decisões por meio de `master_data`, dentro de uma transação idempotente;
- audit não decide regras e não dispara efeitos colaterais.

### Transações e idempotência

- uma chamada de serviço representa a fronteira transacional normal;
- criação de Produto Mestre, DE/PARA e auditoria derivados de uma decisão devem confirmar ou reverter juntos;
- constraints e índices parciais garantem unicidades vigentes, além das validações de serviço;
- uploads calculam SHA-256 durante a leitura e verificam duplicidade por organização/contexto;
- retry técnico reaproveita o mesmo objeto de execução; reprocessamento funcional cria um novo `matching_run`;
- operações mutáveis críticas aceitam uma chave de idempotência ou usam a identidade da decisão como chave natural da operação.

### API REST

- prefixo: `/api/v1`;
- OpenAPI do FastAPI é a fonte do contrato;
- endpoints representam casos de uso, não CRUD genérico de tabelas;
- paginação por cursor é preferível para filas grandes e mutáveis; paginação por página pode ser usada em cadastros pequenos;
- filtros, ordenação permitida e limites máximos são validados no backend;
- upload usa `multipart/form-data` e exportação usa resposta de arquivo/stream;
- operações longas retornam um recurso de processamento com `id`, `status` e erro funcional, permitindo polling.

Formato de erro:

```json
{
  "error": {
    "code": "IMPORT_REQUIRED_COLUMN_MISSING",
    "message": "A coluna de unidade não foi mapeada.",
    "details": {"field": "unit"},
    "request_id": "..."
  }
}
```

## 5. Frontend

### Tecnologias e princípios

- Next.js com App Router e TypeScript estrito;
- React Server Components por padrão;
- Client Components somente para upload, formulários ricos, filtros e interação da revisão;
- cliente HTTP tipado gerado do OpenAPI;
- React Hook Form + Zod apenas para ergonomia e validação imediata de formulário;
- TanStack Query nas experiências client-side que precisem cache, polling ou invalidação;
- testes unitários com Vitest/Testing Library e fluxos críticos com Playwright.

Zod no frontend não substitui Pydantic nem regras do backend. A validação do navegador serve à experiência do usuário; a decisão autoritativa permanece na API.

### Organização por área de negócio

```text
src/
|-- app/
|   |-- (app)/
|   |   |-- importacoes/
|   |   |-- analises/
|   |   |-- revisao/
|   |   |-- base-mestre/
|   |   |-- resultados/
|   |   `-- governanca/
|   `-- layout.tsx
|-- features/
|   |-- imports/
|   |-- matching/
|   |-- reviews/
|   |-- master-data/
|   `-- governance/
|-- components/                    # UI reutilizável sem regra de domínio
|-- lib/                           # api client, auth context e utilitários
`-- generated/                     # tipos OpenAPI; não editar manualmente
```

### Experiência principal

- `Importações`: enviar arquivo, mapear colunas, acompanhar validação e consultar erros por linha;
- `Análises`: iniciar/acompanhar execução e visualizar cobertura geral;
- `Revisão`: fila por exceção, comparação lado a lado, evidências, bloqueadores, pendências e ação humana;
- `Base Mestre`: pesquisar Produtos Mestres e consultar atributos e vínculos;
- `Resultados`: indicadores vigentes e exportação;
- `Governança`: configuração progressiva de perfis, categorias, atributos e regras.

A tela de revisão é o centro operacional. Score agregado nunca deve esconder evidências bloqueadoras ou informação ausente.

## 6. Banco de dados

O `modelo-dados-v0.1.md` permanece a especificação das 26 entidades. A implementação deve acrescentar detalhes físicos por migrations, sem alterar silenciosamente o modelo homologado.

Diretrizes:

- UUID gerado pela aplicação ou por função PostgreSQL definida consistentemente;
- `TIMESTAMPTZ` sempre armazenado em UTC e convertido apenas na apresentação;
- nomes `snake_case`;
- `CHECK` para estados controlados, exclusividade de candidatos e valores positivos;
- índices únicos parciais para “apenas um ativo”;
- `organization_id` presente e indexado nas entidades tenant-owned;
- foreign keys compostas incluindo `organization_id` nos vínculos críticos entre tenants;
- `JSONB` apenas para origem variável, configurações e snapshots de auditoria;
- migrations somente avançam; correção de migration já compartilhada é feita por nova migration.

Consultas sempre recebem o tenant como parte explícita do filtro. PostgreSQL Row-Level Security pode ser adotado como defesa adicional antes de operar múltiplos clientes reais, mas não substitui autorização na aplicação e não é pré-requisito da primeira fatia.

### Backup e recuperação

- backup automático diário em produção;
- retenção e point-in-time recovery definidos conforme o ambiente contratado;
- teste periódico de restauração;
- migrations e restore testados antes de releases que alterem muitas tabelas;
- dados locais de desenvolvimento são descartáveis.

## 7. Importações, arquivos e processamento

No MVP, o arquivo é um meio de entrada, não o repositório oficial do dado:

1. backend recebe o stream e aplica limite de tamanho;
2. calcula o hash enquanto grava em diretório temporário;
3. detecta duplicidade antes de criar/processar o lote;
4. lê cabeçalho e amostra para o mapeamento;
5. persiste cada linha original e seus metadados no PostgreSQL;
6. processa o lote com estados explícitos;
7. remove o arquivo temporário ao finalizar ou falhar de modo controlado.

Se surgir requisito legal de retenção do arquivo original, deve-se introduzir armazenamento de objetos compatível com S3 por uma interface no módulo `imports`. MinIO/S3 não deve ser adicionado preventivamente.

Para exportações, gerar CSV/XLSX sob demanda e transmitir a resposta. O documento de dados exclui histórico persistido de arquivos exportados no MVP.

## 8. Segurança e multi-tenancy

- `organization_id` é derivado do contexto autenticado e validado contra `organization_users`;
- o backend não confia em tenant informado isoladamente no body/query;
- papéis pertencem ao vínculo usuário-organização;
- repositórios recebem `organization_id` obrigatoriamente;
- testes negativos tentam acessar UUIDs de outro tenant em todo módulo;
- senhas, tokens, strings de conexão e chaves nunca aparecem em log;
- upload valida extensão, MIME, tamanho, estrutura e conteúdo antes do processamento;
- CORS usa allowlist explícita;
- headers de segurança e limite de requisições são configurados no proxy/plataforma;
- dependências e imagens são verificadas regularmente.

### Lacuna que precisa de decisão antes de produção

Os documentos modelam usuários e permissões, mas não definem autenticação nem credenciais. Além disso, autenticação corporativa/SSO está fora do MVP. Portanto:

- em desenvolvimento, pode existir uma identidade local sem senha, habilitada somente com `APP_ENV=local` e nunca nas imagens/configurações de produção;
- antes de qualquer publicação para usuários reais, deve ser homologado um ADR escolhendo autenticação gerenciada externa ou credenciais/sessões próprias;
- se a escolha exigir novas tabelas, a alteração deve seguir DP-094/DP-095 antes da migration.

Essa decisão é o único bloqueio arquitetural relevante para uma implantação real; ela não bloqueia a Fundação Técnica nem o primeiro fluxo local.

## 9. Observabilidade e operação

Começar com:

- logs JSON estruturados para stdout;
- `request_id` propagado do frontend ao backend e incluído em erros;
- campos seguros como módulo, operação, tenant, duração e resultado;
- endpoints `/health/live` e `/health/ready`;
- registro de duração e contagem de linhas dos processamentos;
- auditoria funcional no banco separada dos logs técnicos.

Métricas Prometheus, tracing distribuído e plataforma externa de erros entram quando houver ambiente hospedado e necessidade operacional. O monólito não precisa de tracing distribuído no MVP local.

## 10. Qualidade e testes

### Backend

- unitários: normalização, regras, bloqueadores, confiança e decisões;
- integração: repositories, constraints, transações e migrations com PostgreSQL real;
- contrato: OpenAPI e estrutura de erros;
- cenários transversais: os nove cenários já usados para validar o modelo físico.

### Frontend

- unitários: apresentação de estados, evidências e formulários;
- integração: cliente HTTP com respostas simuladas a partir do contrato;
- E2E: importar, mapear, processar, revisar, consolidar e exportar.

### Gates mínimos

- backend: format, lint, testes e verificação de migration;
- frontend: format, lint, typecheck, testes e build;
- integração: banco vazio → migrations → smoke test da API;
- nenhuma alteração de contrato entra sem atualizar/regenerar o cliente tipado.

## 11. Ordem de implementação

### Fatia 1 — Fundação Técnica

- Compose, Dockerfiles, configuração, FastAPI e Next.js;
- PostgreSQL, SQLAlchemy, Alembic e primeira migration;
- healthchecks, erro padrão, request ID e seed local de organização/usuário;
- OpenAPI e cliente TypeScript gerado;
- teste de integração e smoke E2E.

### Fatia 2 — Importação

- sistemas de origem, upload, hash, lote, mapeamento e registros brutos;
- erros por linha e página de acompanhamento.

### Fatia 3 — Normalização e atributos

- configuração controlada do perfil;
- regras determinísticas, atributos extraídos e pendências de informação.

### Fatia 4 — Matching

- baseline lexical e por atributos;
- execução, candidatos, evidências, bloqueadores e conclusão global;
- sem embeddings nesta etapa.

### Fatia 5 — Revisão e Base Mestre

- fila de exceções, decisão humana histórica;
- criação/vínculo transacional de Produto Mestre e DE/PARA;
- auditoria na mesma transação.

### Fatia 6 — Resultados e exportação

- indicadores do estado vigente;
- filtros e exportação sob demanda;
- fechamento do fluxo E2E do Modo 1.

## 12. Critérios para evoluir a infraestrutura

Adicionar um worker e fila somente se medições mostrarem que requisições excedem o timeout operacional, bloqueiam capacidade da API ou precisam sobreviver a reinícios. Nesse momento, o worker consome os mesmos serviços de aplicação; não se cria um segundo domínio.

Adicionar `pgvector` somente depois de medir a baseline lexical/atributos e comprovar ganho relevante da busca semântica. Manter os embeddings no PostgreSQL inicialmente; banco vetorial separado só se volume e latência justificarem.

Separar um microserviço somente quando existir ao menos um motivo concreto: escala independente comprovada, ciclo de release independente, requisito de isolamento ou equipe proprietária distinta. Tamanho de pasta não é motivo.

## 13. Decisões finais

- **Sim:** monorepo, monólito modular, REST, PostgreSQL, Docker Compose local, imagens separadas, migrations, OpenAPI, testes e logs estruturados.
- **Agora não:** Redis, filas, workers, object storage permanente, pgvector, microserviços, Kubernetes e observabilidade distribuída.
- **Pendente antes de produção:** estratégia de autenticação de usuários reais.
- **Próximo passo recomendado:** implementar somente a Fatia 1 e validá-la de ponta a ponta antes de criar as 26 tabelas e módulos completos.
