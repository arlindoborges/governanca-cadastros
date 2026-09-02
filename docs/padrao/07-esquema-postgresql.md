# Convenções de Esquema PostgreSQL

## 1. Fonte do modelo

[modelo-dados-v0.1.md](../modelo-dados-v0.1.md) define as 26 entidades oficiais. Mudanças estruturais exigem decisão registrada antes da implementação.

## 2. Convenções

- tabelas e colunas em `snake_case` e inglês, preservando os nomes homologados;
- UUID como chave interna das entidades principais;
- código de negócio em coluna separada;
- `TIMESTAMPTZ` para instantes e `DATE` para data civil;
- texto controlado com `CHECK`, sem ENUM nativo no MVP;
- `JSONB` apenas para variabilidade real, origem, configuração e auditoria;
- `NUMERIC` para fatores, medidas e scores que não tolerem erro binário;
- foreign keys explícitas e indexadas conforme o padrão de consulta;
- exclusão lógica em governança e dados mestres;
- eventos de auditoria append-only.

## 3. Multi-tenancy

- `organization_id` é obrigatório nas entidades tenant-owned definidas pelo modelo;
- unicidades de negócio incluem `organization_id`;
- vínculos críticos impedem referência entre organizações;
- nenhum código de origem é globalmente único;
- a Base Mestre é isolada por organização.

## 4. Constraints obrigatórias

- exatamente uma referência em `match_candidates`;
- apenas uma versão ativa por Perfil de Governança;
- apenas uma decisão vigente por contexto;
- apenas um mapping ativo por registro de origem;
- uma decisão de criação origina no máximo um Produto Mestre;
- fator de conversão maior que zero;
- constraints de estado e integridade listadas no modelo físico.

Usar índices únicos parciais para regras condicionadas a status quando aplicável.

## 5. Dados e consultas

- registros brutos importados são funcionalmente imutáveis;
- alterações derivadas são persistidas em estruturas próprias;
- queries são parametrizadas;
- evitar `SELECT *` em contratos e caminhos sensíveis;
- paginação, contagens e filtros acontecem no banco;
- índices adicionais devem responder a query real observada.

## 6. Proibições

- não editar banco de produção manualmente como processo de release;
- não usar migration para inserir segredo ou usuário real;
- não remover coluna/tabela em uma única etapa quando houver consumidores ativos;
- não alterar migration já aplicada em ambiente compartilhado;
- não criar índice ou extensão pesada sem medir impacto.

