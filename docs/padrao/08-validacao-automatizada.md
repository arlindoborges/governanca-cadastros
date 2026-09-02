# Validação Automatizada

## 1. Objetivo

Fornecer feedback rápido durante o desenvolvimento e um gate confiável antes de integrar ou publicar alterações.

## 2. Camadas de validação

### Frontend

- formatação e lint;
- TypeScript sem emissão;
- testes unitários e de componentes;
- build Next.js;
- Playwright para fluxos críticos.

### Backend

- Ruff format/check;
- testes unitários;
- testes de integração com PostgreSQL real;
- aplicação das migrations em banco vazio;
- smoke da API e validação do OpenAPI.

### Repositório

- verificador de estrutura e limites;
- busca de segredos e arquivos proibidos;
- build das imagens Docker;
- `docker compose config`;
- validação de links da documentação;
- testes negativos de multi-tenancy/IDOR.

## 3. Comandos-alvo

Os comandos serão ligados quando os projetos forem inicializados:

```text
make format
make lint
make typecheck
make test
make test-integration
make build
make validate
```

Em Windows, podem existir wrappers PowerShell equivalentes chamando as mesmas ferramentas. Um comando raiz deve orquestrar, não reimplementar os gates.

## 4. Gates por momento

- durante edição: format/lint/teste focado;
- após lote frontend: typecheck completo do frontend;
- após alteração de contrato: regenerar cliente + typecheck + teste de contrato;
- após alteração de migration: banco vazio + upgrade completo + testes de integração;
- antes da entrega: gate completo proporcional ao escopo;
- antes de release: checklist de segurança e build das imagens.

## 5. Baselines

O projeto começa novo e não deve importar dívida ou números da Torre. Se uma baseline for inevitável:

- registrar justificativa e data;
- conter somente ocorrências reais deste repositório;
- impedir crescimento;
- reduzir progressivamente;
- nunca regenerar para esconder falha nova.

## 6. Cobertura funcional mínima

Cada fatia vertical deve possuir:

- teste unitário das regras centrais;
- teste de integração da persistência e transação;
- smoke do endpoint principal;
- cenário E2E do caminho feliz;
- cenário negativo de autorização/tenant quando aplicável.

Importação, decisão humana, criação de Produto Mestre e DE/PARA exigem também testes de idempotência e falha transacional.

## 7. Evolução dos validadores do kit

Os scripts em `torre-padrao-arquitetura/scripts/` são apenas referência. Antes de promover qualquer um:

1. remover nomes e módulos do produto de origem;
2. substituir regras TypeScript/Express/MySQL por Next.js/FastAPI/PostgreSQL;
3. criar fixtures e baselines novas;
4. adicionar testes de regressão do próprio validador;
5. ligar o comando somente após ele passar no repositório atual.

