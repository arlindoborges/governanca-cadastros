# Modelo Físico v0.1

## 1. Objetivo

Este documento consolida a especificação do Modelo Físico v0.1 do MVP da aplicação de governança de cadastros. Ele descreve entidades, campos, relacionamentos, restrições e princípios que orientarão a implementação futura no PostgreSQL, sem constituir implementação, migration, SQL ou modelo ORM.

## 2. Convenções Físicas

- PostgreSQL será o banco principal.
- Entidades principais utilizarão UUID como chave primária interna; códigos de negócio serão armazenados separadamente.
- Tabelas e colunas utilizarão `snake_case`.
- Datas e horários utilizarão `TIMESTAMPTZ`; datas sem horário utilizarão `DATE`.
- `JSONB` será utilizado apenas onde existir variabilidade real, preservação do dado de origem ou configuração parametrizada.
- O MVP 0.1 não utilizará `ENUM` nativo do PostgreSQL. Estados e tipos serão campos textuais controlados, com constraints quando necessário.
- A segregação multi-tenant estará presente desde o modelo inicial, e a Base Mestre será isolada por organização.
- Dados originais importados serão funcionalmente imutáveis.
- Históricos de decisões, DE/PARA e auditoria serão preservados.
- Auditoria de negócio será separada dos logs técnicos e terá eventos append-only do ponto de vista funcional.
- Matching, evidências, resultado global e decisão humana serão conceitos separados.
- Similaridade não significará equivalência; atributos bloqueadores terão precedência sobre scores.
- Informação ausente poderá gerar pendência e nunca será inventada.
- Retry técnico e reprocessamento funcional serão conceitos distintos.

## 3. Visão Geral das Entidades

O Modelo Físico v0.1 contém exatamente estas 26 entidades oficiais:

1. `organizations`
2. `users`
3. `organization_users`
4. `source_systems`
5. `import_batches`
6. `source_records`
7. `governance_profiles`
8. `governance_profile_versions`
9. `classification_levels`
10. `category_nodes`
11. `attribute_definitions`
12. `category_attribute_rules`
13. `governance_rules`
14. `normalization_rules`
15. `source_record_attributes`
16. `matching_runs`
17. `matching_results`
18. `match_candidates`
19. `match_evidences`
20. `review_issues`
21. `sanitization_decisions`
22. `master_products`
23. `master_product_attributes`
24. `product_mappings`
25. `conversion_factors`
26. `audit_events`

## 4. Fundação e Multi-Tenant

### `organizations`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `name` | VARCHAR(200), NOT NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

### `users`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `name` | VARCHAR(200), NOT NULL |
| `email` | VARCHAR(320), NOT NULL, UNIQUE |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

### `organization_users`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `user_id` | UUID, FK |
| `role` | VARCHAR(50), NOT NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |

Restrição de unicidade: (`organization_id`, `user_id`). Papéis e permissões pertencem ao vínculo entre usuário e organização, não globalmente ao usuário.

## 5. Importação e Linhagem

### `source_systems`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `name` | VARCHAR(150), NOT NULL |
| `description` | TEXT, NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

Restrição de unicidade: (`organization_id`, `name`).

### `import_batches`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `source_system_id` | UUID, FK |
| `file_name` | VARCHAR(255), NOT NULL |
| `file_type` | VARCHAR(20), NOT NULL |
| `file_hash` | VARCHAR(64), apropriado para SHA-256 |
| `column_mapping` | JSONB |
| `source_reference_date` | DATE, NULL |
| `status` | VARCHAR(30), NOT NULL |
| `total_rows` | INTEGER, DEFAULT 0 |
| `valid_rows` | INTEGER, DEFAULT 0 |
| `invalid_rows` | INTEGER, DEFAULT 0 |
| `imported_at` | TIMESTAMPTZ, NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

O hash detectará reimportações de arquivos binariamente idênticos no mesmo contexto organizacional, sem constituir unicidade global. A duplicidade será determinada pelo conteúdo, não pelo nome do arquivo. `column_mapping` preservará o vínculo entre colunas do arquivo e campos internos.

### `source_records`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `source_system_id` | UUID, FK |
| `import_batch_id` | UUID, FK |
| `row_number` | INTEGER, NOT NULL |
| `source_code` | VARCHAR(255), NULL |
| `original_description` | TEXT, NULL |
| `original_unit` | VARCHAR(100), NULL |
| `normalized_description` | TEXT, NULL |
| `raw_data` | JSONB, NOT NULL, DEFAULT `{}` |
| `processing_status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

Cada registro preservará sua linha original e o dado bruto importado. Linhas inválidas permanecerão disponíveis para diagnóstico, inclusive quando código, descrição ou unidade estiverem ausentes.

A combinação `source_system_id + source_code` formará uma identidade longitudinal lógica, mas não será uma constraint UNIQUE. Seus snapshots serão observações históricas da mesma identidade. O snapshot vigente será derivado da cronologia dos lotes, priorizando `source_reference_date` quando disponível e, na ausência dela, a cronologia de importação.

## 6. Perfil de Governança

### `governance_profiles`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `name` | VARCHAR(200), NOT NULL |
| `description` | TEXT, NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

### `governance_profile_versions`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `governance_profile_id` | UUID, FK |
| `version_number` | INTEGER, NOT NULL |
| `status` | VARCHAR(30), NOT NULL |
| `effective_from` | TIMESTAMPTZ, NULL |
| `effective_to` | TIMESTAMPTZ, NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |

Restrição de unicidade: (`governance_profile_id`, `version_number`). No MVP 0.1, apenas uma versão poderá estar `ACTIVE` por Perfil de Governança.

## 7. Classificação e Atributos

### `classification_levels`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `governance_profile_version_id` | UUID, FK |
| `level_number` | INTEGER, NOT NULL |
| `name` | VARCHAR(100), NOT NULL |
| `status` | VARCHAR(30), NOT NULL |

Os níveis permitem nomenclaturas configuráveis; por exemplo: 1 = Grupo, 2 = Subgrupo e 3 = Classe.

### `category_nodes`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `governance_profile_version_id` | UUID, FK |
| `parent_id` | UUID, FK para `category_nodes.id`, NULL para raiz |
| `code` | VARCHAR(100), NOT NULL |
| `name` | VARCHAR(200), NOT NULL |
| `level` | INTEGER, NOT NULL |
| `description` | TEXT, NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

A taxonomia será hierárquica e genérica, baseada na relação pai/filho.

### `attribute_definitions`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `code` | VARCHAR(100), NOT NULL |
| `name` | VARCHAR(200), NOT NULL |
| `data_type` | VARCHAR(30), NOT NULL |
| `unit_type` | VARCHAR(50), NULL |
| `description` | TEXT, NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

Restrição de unicidade: (`organization_id`, `code`). Unidade cadastral ou logística e unidade de medida de atributo são conceitos distintos. Valores como `CX`, `UN` e `PC` não devem ser confundidos com `L`, `ML`, `KG` e `G`.

### `category_attribute_rules`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `category_node_id` | UUID, FK |
| `attribute_definition_id` | UUID, FK |
| `required` | BOOLEAN, NOT NULL |
| `sku_relevant` | BOOLEAN, NOT NULL |
| `equivalence_blocker` | BOOLEAN, NOT NULL |
| `priority` | INTEGER, NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |

Restrição de unicidade: (`category_node_id`, `attribute_definition_id`). O MVP 0.1 não terá herança automática de regras entre categorias pai e filho; as regras aplicáveis serão explicitamente configuradas.

### `governance_rules`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `governance_profile_version_id` | UUID, FK |
| `category_node_id` | UUID, FK, NULL |
| `code` | VARCHAR(100) |
| `name` | VARCHAR(200) |
| `rule_type` | VARCHAR(50) |
| `configuration` | JSONB |
| `description` | TEXT |
| `priority` | INTEGER |
| `status` | VARCHAR(30) |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ |

O backend suportará tipos de regra parametrizados por `configuration`. O MVP 0.1 não terá uma linguagem universal de regras.

### `normalization_rules`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `governance_profile_version_id` | UUID, FK |
| `rule_type` | VARCHAR(50) |
| `source_pattern` | TEXT |
| `target_value` | TEXT |
| `priority` | INTEGER |
| `status` | VARCHAR(30) |
| `created_at` | TIMESTAMPTZ |

As regras de normalização permanecerão separadas das regras de equivalência e governança.

### `source_record_attributes`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `source_record_id` | UUID, FK |
| `attribute_definition_id` | UUID, FK |
| `value_text` | TEXT, NULL |
| `value_number` | NUMERIC, NULL |
| `value_boolean` | BOOLEAN, NULL |
| `unit` | VARCHAR(50), NULL |
| `extraction_method` | VARCHAR(30) |
| `confidence` | NUMERIC(5,4), NULL |
| `confirmed` | BOOLEAN |
| `confirmed_by_user_id` | UUID, FK, NULL |
| `confirmed_at` | TIMESTAMPTZ, NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

Dados originais não serão sobrescritos por atributos inferidos ou confirmados. Valores obtidos posteriormente serão armazenados separadamente, com método de extração, confiança e, quando aplicável, autoria e data da confirmação.

## 8. Matching e Evidências

### `matching_runs`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `import_batch_id` | UUID, FK, NULL |
| `governance_profile_version_id` | UUID, FK |
| `algorithm_version` | VARCHAR(100) |
| `trigger_type` | VARCHAR(50) |
| `status` | VARCHAR(30) |
| `started_at` | TIMESTAMPTZ |
| `completed_at` | TIMESTAMPTZ, NULL |
| `configuration` | JSONB |
| `created_at` | TIMESTAMPTZ |

Cada nova análise funcional gerará um novo `matching_run`, registrando versão do algoritmo, versão do Perfil de Governança, configuração e motivo. Retry técnico não representará nova análise de negócio.

### `matching_results`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `matching_run_id` | UUID, FK |
| `source_record_id` | UUID, FK |
| `result` | VARCHAR(40) |
| `confidence_level` | VARCHAR(30), NULL |
| `candidate_count` | INTEGER |
| `has_blocker` | BOOLEAN |
| `requires_review` | BOOLEAN |
| `created_at` | TIMESTAMPTZ |

Esta entidade representa a conclusão global da análise de cada registro, mesmo quando não existirem candidatos. Resultado e confiança são conceitos separados.

### `match_candidates`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `matching_result_id` | UUID, FK |
| `source_record_id` | UUID, FK |
| `candidate_source_record_id` | UUID, FK, NULL |
| `candidate_master_product_id` | UUID, FK, NULL |
| `governance_profile_version_id` | UUID, FK |
| `lexical_score` | NUMERIC(5,4), NULL |
| `semantic_score` | NUMERIC(5,4), NULL |
| `attribute_score` | NUMERIC(5,4), NULL |
| `overall_score` | NUMERIC(5,4), NULL |
| `relationship_class` | VARCHAR(40) |
| `confidence_level` | VARCHAR(30), NULL |
| `has_blocker` | BOOLEAN |
| `created_at` | TIMESTAMPTZ |

Exatamente um entre `candidate_source_record_id` e `candidate_master_product_id` deverá estar preenchido. `relationship_class` expressará a relação individual como `EQUIVALENT`, `SIMILAR`, `DIFFERENT` ou `INDETERMINATE`.

### `match_evidences`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `match_candidate_id` | UUID, FK |
| `attribute_definition_id` | UUID, FK, NULL |
| `evidence_type` | VARCHAR(50) |
| `evidence_source` | VARCHAR(50) |
| `source_value` | TEXT, NULL |
| `candidate_value` | TEXT, NULL |
| `result` | VARCHAR(30) |
| `is_blocker` | BOOLEAN |
| `score` | NUMERIC(5,4), NULL |
| `description` | TEXT |
| `created_at` | TIMESTAMPTZ |

Cada evidência preservará sua proveniência, distinguindo dados de origem, regras determinísticas, Perfil de Governança, modelos de IA e confirmações humanas. Bloqueadores válidos terão precedência sobre scores.

Alta similaridade lexical ou semântica não implica alta confiança nem equivalência. Um conflito confirmado em atributo bloqueador impedirá equivalência. A ausência de informação necessária em bloqueador produzirá `PENDING_INFORMATION`, e não diferença presumida. A classificação `SIMILAR` poderá coexistir com equivalência bloqueada.

## 9. Pendências e Revisão Humana

### `review_issues`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `source_record_id` | UUID, FK |
| `match_candidate_id` | UUID, FK, NULL |
| `attribute_definition_id` | UUID, FK, NULL |
| `issue_type` | VARCHAR(50) |
| `description` | TEXT |
| `status` | VARCHAR(30) |
| `resolution` | TEXT, NULL |
| `resolved_by_user_id` | UUID, FK, NULL |
| `resolved_at` | TIMESTAMPTZ, NULL |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ |

Pendência e evidência de matching serão conceitos separados. Pendências identificarão explicitamente a informação ou revisão que impede uma conclusão e permitirão acompanhar sua resolução. Resolver uma pendência deixará o registro apto a reprocessamento, sem disparar implicitamente nova decisão de matching no MVP 0.1.

## 10. Decisões de Saneamento

### `sanitization_decisions`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `match_candidate_id` | UUID, FK, NULL |
| `source_record_id` | UUID, FK, NULL |
| `decision` | VARCHAR(40) |
| `status` | VARCHAR(30) |
| `reason` | TEXT, NULL |
| `decided_by_user_id` | UUID, FK |
| `decided_at` | TIMESTAMPTZ |
| `supersedes_decision_id` | UUID, FK, NULL |
| `created_at` | TIMESTAMPTZ |

A decisão poderá ocorrer sobre um candidato ou diretamente sobre um registro sem candidato adequado. Apenas uma decisão poderá estar vigente para o mesmo contexto de análise. Revisões criarão nova decisão, referenciarão a anterior por `supersedes_decision_id` e não sobrescreverão o histórico.

Não encontrar candidato equivalente será resultado da análise, não prova absoluta de que um equivalente não exista. A ausência de equivalente também não autorizará criar Produto Mestre enquanto requisitos obrigatórios definidos pelo Perfil de Governança permanecerem pendentes.

## 11. Produto Mestre, DE/PARA e Conversões

### `master_products`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `master_code` | VARCHAR(100), NOT NULL |
| `standardized_description` | TEXT, NOT NULL |
| `unit` | VARCHAR(100), NOT NULL |
| `category_node_id` | UUID, FK, NULL |
| `status` | VARCHAR(30), NOT NULL |
| `created_from_decision_id` | UUID, FK, NULL |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |

Restrição de unicidade: (`organization_id`, `master_code`). Quando preenchido, `created_from_decision_id` deverá impedir que a mesma decisão origine dois Produtos Mestres. A Base Mestre será isolada por organização.

### `master_product_attributes`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `master_product_id` | UUID, FK |
| `attribute_definition_id` | UUID, FK |
| `value_text` | TEXT, NULL |
| `value_number` | NUMERIC, NULL |
| `value_boolean` | BOOLEAN, NULL |
| `unit` | VARCHAR(50), NULL |
| `source` | VARCHAR(30) |
| `confirmed` | BOOLEAN |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ |

Restrição de unicidade: (`master_product_id`, `attribute_definition_id`).

### `product_mappings`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `source_record_id` | UUID, FK |
| `master_product_id` | UUID, FK |
| `decision_id` | UUID, FK, NULL |
| `mapping_type` | VARCHAR(40) |
| `status` | VARCHAR(30) |
| `supersedes_mapping_id` | UUID, FK, NULL |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ |

Somente um mapping poderá estar `ACTIVE` por `source_record_id` no fluxo normal do MVP. Revisões preservarão a relação de substituição com o vínculo anterior, sua inativação lógica e a auditoria correspondente.

### `conversion_factors`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `product_mapping_id` | UUID, FK |
| `source_unit` | VARCHAR(100) |
| `target_unit` | VARCHAR(100) |
| `factor` | NUMERIC |
| `description` | TEXT, NULL |
| `confirmed` | BOOLEAN |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ |

O valor de `factor` deverá ser maior que zero. Um fator somente existirá quando sustentado por evidência ou confirmação humana; quantidades ausentes não serão inferidas.

## 12. Auditoria

### `audit_events`

| Campo | Tipo e restrições |
|---|---|
| `id` | UUID, PK |
| `organization_id` | UUID, FK |
| `event_type` | VARCHAR(100) |
| `entity_type` | VARCHAR(100) |
| `entity_id` | UUID |
| `user_id` | UUID, FK, NULL |
| `event_data` | JSONB |
| `created_at` | TIMESTAMPTZ |

Esta entidade registrará auditoria de negócio e rastreabilidade das decisões, não logs técnicos da aplicação. Seus eventos serão append-only do ponto de vista funcional: não serão editados, e correções ou mudanças gerarão novos eventos. Alterações relevantes do Produto Mestre preservarão estado anterior e posterior em eventos de auditoria.

## 13. Integridade Multi-Tenant

- Toda leitura e escrita sobre dados organizacionais será autorizada no contexto do tenant.
- Conhecer o UUID de um objeto não concederá acesso a dados de outra organização.
- O isolamento entre organizações será imposto no backend; filtros de frontend não serão considerados mecanismo suficiente.
- Relacionamentos críticos capazes de cruzar tenants utilizarão integridade referencial compatível com `organization_id`, além de validação na camada de serviço.
- Sistemas de origem, importações, matching, pendências, decisões, Base Mestre, DE/PARA e auditoria respeitarão a organização proprietária.
- Não haverá catálogo mestre global automaticamente compartilhado entre organizações.

## 14. Idempotência e Reprocessamento

- O hash do arquivo permitirá detectar duplicidade binária no mesmo contexto organizacional antes da criação de novo lote, sem unicidade global.
- Processamentos terão estado explícito para impedir execução concorrente acidental do mesmo estágio sobre o mesmo objeto de trabalho.
- Falhas técnicas recuperáveis poderão ser reexecutadas sobre o mesmo lote sem nova importação.
- Retry técnico retomará uma execução falha e não representará novo snapshot nem nova análise de negócio.
- Reprocessamento funcional criará novo `matching_run`, preservando contexto, regras, configuração, versão do algoritmo e motivo do processamento.
- Realizações derivadas de decisão humana serão protegidas contra duplicação transacional.

## 15. Índices e Constraints Mínimas

Índices iniciais necessários, sem antecipar otimizações excessivas:

- `source_systems.organization_id`
- `import_batches.organization_id`
- `import_batches.source_system_id`
- `import_batches.status`
- `import_batches.file_hash`
- `source_records.organization_id`
- `source_records.import_batch_id`
- `source_records.source_system_id`
- `source_records.source_code`
- `source_records.processing_status`
- `matching_runs.organization_id`
- `matching_results.matching_run_id`
- `match_candidates.matching_result_id`
- `review_issues.source_record_id`
- `review_issues.status`
- `master_products.organization_id`
- `product_mappings.source_record_id`
- `product_mappings.master_product_id`
- `audit_events.organization_id`
- `audit_events.created_at`

Índices de similaridade textual ou vetorial serão definidos posteriormente, após escolha e teste das técnicas de matching.

Constraints mínimas documentadas:

- unicidades compostas indicadas nas entidades;
- apenas uma versão `ACTIVE` por Perfil de Governança;
- exatamente uma referência de candidato preenchida em cada candidato de matching;
- apenas uma decisão vigente por contexto de análise;
- uma decisão de criação não poderá originar múltiplos Produtos Mestres;
- somente um mapping `ACTIVE` por registro de origem no fluxo normal;
- `factor > 0` para fatores de conversão;
- integridade multi-tenant compatível com `organization_id` nos relacionamentos críticos.

## 16. Itens Deliberadamente Fora do Modelo v0.1

- Tabelas do Modo 2 de novos cadastros.
- Integração direta com ERP.
- Histórico transacional detalhado de compras e movimentações.
- Reconstrução completa de `HISTORICAL_SPLIT`.
- Catálogo mestre global entre organizações.
- Autenticação corporativa ou SSO.
- Engine universal de regras.
- Herança automática de regras entre categorias.
- Versionamento completo de Produto Mestre.
- Analytics point-in-time sofisticado.
- Banco vetorial separado.
- Filas ou workers distribuídos.
- Fingerprint semântico do dataset.
- Histórico persistido de arquivos exportados.

## 17. Diagrama Lógico Consolidado

```text
organizations
├── organization_users ── users
├── source_systems
│   └── import_batches
│       └── source_records
│           ├── source_record_attributes
│           └── review_issues
├── governance_profiles
│   └── governance_profile_versions
│       ├── classification_levels
│       ├── category_nodes
│       │   └── category_attribute_rules
│       ├── governance_rules
│       └── normalization_rules
├── attribute_definitions
├── matching_runs
│   └── matching_results
│       └── match_candidates
│           ├── match_evidences
│           └── sanitization_decisions
├── master_products
│   └── master_product_attributes
├── product_mappings
│   └── conversion_factors
└── audit_events
```

O diagrama mostra o caminho principal, mas `sanitization_decisions` também pode referenciar diretamente `source_records`; portanto, uma decisão não depende obrigatoriamente de `match_candidates`.

## 18. Estado do Modelo

- Modelo Físico v0.1 consolidado após validação transversal de nove cenários.
- Ainda não implementado no PostgreSQL.
- Este documento será utilizado como especificação para migrations e modelos ORM.
- Alterações estruturais posteriores exigem nova Decisão do Projeto.
