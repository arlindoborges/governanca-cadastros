# Migrations PostgreSQL

## 1. Ferramenta e localização

Alembic é a ferramenta oficial. Migrations ficam em `backend/migrations/versions/` e modelos SQLAlchemy em seus módulos funcionais.

## 2. Regras

- toda mudança de schema é uma migration versionada;
- migration já aplicada em ambiente compartilhado não é editada;
- nomes de revision e mensagens descrevem a alteração;
- upgrade deve ser determinístico;
- downgrade é desejável quando seguro, mas não deve fingir reversibilidade em perda de dados;
- SQL manual usa parâmetros quando houver valores externos;
- extensions PostgreSQL exigem decisão explícita;
- backfill volumoso não deve bloquear migration transacional longa sem plano.

## 3. Estratégia expand/contract

Para mudança incompatível:

1. adicionar nova estrutura compatível;
2. publicar código que aceite estrutura antiga e nova;
3. migrar/backfill dados;
4. trocar consumidores;
5. remover estrutura antiga em release posterior.

## 4. Multi-tenancy e auditoria

Migration que cria vínculo tenant-owned deve incluir `organization_id`, índices, unicidades e foreign keys coerentes. Correções históricas geram eventos ou script auditável; não reescrevem auditoria silenciosamente.

## 5. Validação

- criar banco vazio;
- aplicar todas as migrations até `head`;
- comparar metadata esperada;
- executar testes de constraints;
- testar upgrade a partir da versão suportada mais antiga;
- revisar locks e impacto para alterações em tabelas volumosas.

Migrations devem rodar uma única vez como etapa de release, nunca simultaneamente em todas as réplicas da API.

