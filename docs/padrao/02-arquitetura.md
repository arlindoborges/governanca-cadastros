# Arquitetura de Aplicação

## 1. Visão geral

O sistema é um monorepo com frontend Next.js, backend FastAPI e PostgreSQL. O backend é um monólito modular. A API REST versionada sob `/api/v1` é a única fronteira funcional entre frontend e backend.

```text
Browser -> Next.js -> FastAPI -> PostgreSQL
                         |
                         `-> arquivos temporários de importação/exportação
```

## 2. Frontend

```text
frontend/src/
|-- app/                 # rotas, layouts e composição de página
|-- features/            # comportamento por capacidade de negócio
|-- components/
|   |-- ui/              # componentes genéricos
|   `-- shared/          # composição reutilizada entre features
|-- lib/                 # cliente HTTP, sessão e utilitários transversais
`-- generated/           # tipos derivados do OpenAPI
```

### Responsabilidades

- `app/`: roteamento, layouts, carregamento inicial e composição;
- `features/`: hooks, formulários, componentes e adaptadores de uma capacidade;
- `components/ui`: apresentação genérica sem regra de negócio;
- `lib/api`: única base de comunicação HTTP;
- `generated`: contrato gerado, sem edição manual.

Componente não chama API de forma dispersa. Operações remotas passam pelo cliente central e pela camada da feature. Regra autoritativa nunca fica no frontend.

Quando uma feature crescer, dividir internamente por tarefa, como `listagem/`, `formulario/`, `revisao/` e `detalhe/`. Não adotar `session/` apenas por herança do projeto de origem.

## 3. Backend

```text
backend/src/app/
|-- main.py
|-- core/
|-- organizations/
|-- imports/
|-- governance/
|-- normalization/
|-- matching/
|-- reviews/
|-- master_data/
|-- audit/
`-- exports/
```

Estrutura interna preferencial:

```text
<modulo>/
|-- router.py
|-- schemas.py
|-- service.py
|-- models.py
|-- repository.py
`-- errors.py
```

Criar somente os arquivos necessários. O fluxo normal é:

```text
router -> service -> repository/model -> PostgreSQL
                    `-> auditoria na mesma transação
```

- router trata HTTP, dependências, autenticação e serialização;
- schema valida entrada e saída;
- service executa casos de uso, autorização contextual e transações;
- repository encapsula consultas não triviais e tenant-scoped;
- model representa persistência, não o contrato público.

## 4. Dependências entre módulos

- `imports` não conhece UI nem matching;
- `normalization` usa governança e preserva o registro original;
- `matching` consulta normalização, governança e dados mestres;
- `reviews` registra decisão e solicita realização a `master_data`;
- `master_data` cria Produto Mestre/DE-PARA de modo transacional e idempotente;
- `audit` recebe eventos, mas não decide nem dispara regras;
- `exports` lê resultados autorizados e gera arquivos sob demanda.

Módulos usam interfaces públicas do módulo proprietário. Evitar consultas cruzadas improvisadas e imports circulares.

## 5. API

- contratos orientados a casos de uso, não CRUD de tabela;
- envelope de sucesso consistente e erro conforme `04-seguranca.md`;
- paginação e filtros no backend;
- upload por `multipart/form-data`;
- exportação por stream;
- operações demoradas expõem recurso com estado para polling;
- endpoints de saúde fora de `/api/v1`: `/health/live` e `/health/ready`.

## 6. Evolução

Fila/worker, `pgvector`, object storage, cache distribuído e microserviços só entram pelos critérios de [arquitetura técnica](../arquitetura-tecnica-v0.1.md). Nunca adicionar preventivamente.

