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
- **DP-034** — Usuários e organizações terão relacionamento N:N por tabela associativa, permitindo que um usuário pertença futuramente a mais de uma organização sem alterar o modelo central.
- **DP-035** — Códigos de origem não serão globalmente únicos no banco; sua repetição entre lotes será permitida para preservar histórico e linhagem das importações.
- **DP-036** — Status do MVP 0.1 não utilizarão ENUM nativo do PostgreSQL; serão representados por campos textuais controlados e constraints quando necessário, preservando facilidade de evolução.
- **DP-037** — O mapeamento das colunas de cada importação será preservado no próprio lote por JSONB, garantindo rastreabilidade entre as colunas do arquivo e os campos internos.
- **DP-038** — Cada registro importado preservará o número da linha original do arquivo para rastreabilidade e tratamento de erros.
- **DP-039** — Linhas inválidas serão preservadas para diagnóstico. Código, descrição e unidade são obrigatórios para validade cadastral, mas poderão ser nulos no registro bruto importado quando a ausência for justamente a inconsistência detectada.
- **DP-040** — Cada Perfil de Governança poderá possuir várias versões históricas, mas apenas uma versão `ACTIVE` por vez no MVP 0.1.
- **DP-041** — O Perfil de Governança definirá também os níveis da taxonomia e suas nomenclaturas, permitindo estruturas como Grupo/Subgrupo/Classe ou outras equivalentes sem alteração do banco.
- **DP-042** — O MVP 0.1 não implementará herança automática de regras entre níveis da taxonomia. As regras aplicáveis à categoria serão explicitamente configuradas, evitando precedência e sobrescrita implícitas.
- **DP-043** — Regras gerais de governança serão armazenadas como tipos de regra suportados pelo backend com configuração parametrizada; o MVP 0.1 não tentará implementar uma linguagem universal de regras.
- **DP-044** — Regras de normalização serão mantidas separadas das regras de equivalência/governança, permitindo evolução independente dos dois mecanismos.
- **DP-045** — O resultado inicial de matching utilizará quatro estados semânticos distintos: `EQUIVALENT`, `SIMILAR`, `DIFFERENT` e `PENDING_INFORMATION`; similaridade nunca será tratada automaticamente como equivalência.
- **DP-046** — Classe de resultado e nível de confiança serão armazenados separadamente; thresholds de confiança permanecerão configuráveis e serão calibrados empiricamente.
- **DP-047** — A presença de evidência bloqueadora válida terá precedência sobre scores de similaridade e impedirá recomendação `EQUIVALENT`.
- **DP-048** — Cada processamento de matching será identificado por uma execução (`matching_run`) contendo versão do algoritmo, versão do Perfil de Governança e configuração utilizada, permitindo reproduzir e comparar resultados.
- **DP-049** — A decisão humana registrará explicitamente a conclusão do analista, enquanto seu status indicará se a decisão permanece vigente; revisões criarão nova decisão e substituirão a anterior sem apagá-la.
- **DP-050** — Um registro de origem poderá possuir histórico de múltiplos DE/PARA, mas somente um `product_mapping` ativo por vez no fluxo normal do MVP 0.1.
- **DP-051** — Fatores de conversão somente serão registrados quando sustentados por evidência ou confirmação humana; quantidades ausentes nunca serão inferidas por convenção ou probabilidade.
- **DP-052** — A decisão de saneamento poderá ocorrer tanto sobre um candidato de matching quanto diretamente sobre um registro sem candidato adequado, permitindo homologar a criação de novo Produto Mestre sem fabricar uma comparação artificial.
- **DP-053** — Auditoria de negócio será separada de logs técnicos da aplicação; `audit_events` registrará eventos relevantes para governança e rastreabilidade das decisões.
- **DP-054** — Eventos de auditoria serão imutáveis do ponto de vista funcional; correções e mudanças gerarão novos eventos em vez de alterar eventos históricos.
- **DP-055** — O Modelo Físico v0.1 deverá passar por validação transversal com cenários reais e casos-limite antes da implementação, verificando se suporta o fluxo funcional sem exceções artificiais ou perda de rastreabilidade.
- **DP-056** — O sistema distinguirá explicitamente unidade cadastral/logística de unidade de medida de atributos. A unidade do cadastro (`CX`, `UN`, `PC` etc.) não será tratada como equivalente à unidade associada a atributos quantitativos (`L`, `ML`, `KG`, `G` etc.).
- **DP-057** — Toda evidência relevante utilizada pelo matching deverá preservar sua proveniência, distinguindo dados de origem, regras determinísticas, Perfil de Governança, modelos de IA e confirmações humanas.
- **DP-058** — O nível de confiança deverá considerar suficiência, qualidade e coerência das evidências disponíveis; alta similaridade lexical ou semântica isoladamente não poderá produzir alta confiança de equivalência.
- **DP-059** — O matching distinguirá a classificação da relação entre produtos da elegibilidade para equivalência. Produtos poderão ser classificados como `SIMILAR` e simultaneamente possuir equivalência bloqueada por regra ou atributo.
- **DP-060** — Atributo bloqueador conflitante impedirá equivalência por incompatibilidade comprovada; atributo bloqueador necessário porém ausente resultará em informação insuficiente, não em diferença presumida.
- **DP-061** — Pendências que exigem revisão humana serão representadas explicitamente e separadas das evidências de matching, permitindo identificar o que impede uma conclusão e acompanhar sua resolução.
- **DP-062** — Dados originais importados serão imutáveis do ponto de vista funcional; informações obtidas posteriormente por regra, IA ou revisão humana serão armazenadas separadamente, preservando a distinção entre origem, interpretação e resultado governado.
- **DP-063** — Atributos confirmados ou informados manualmente preservarão autoria e data da confirmação, além do método de obtenção do valor.
- **DP-064** — A resolução de uma pendência não disparará implicitamente uma nova decisão de matching no MVP 0.1; o registro ficará apto a reprocessamento, preservando cada execução como evento explícito e auditável.
- **DP-065** — A ausência de candidato equivalente identificável será tratada como resultado da análise, e não como prova absoluta de inexistência de equivalente na base; a criação de novo Produto Mestre continuará condicionada à decisão humana.
- **DP-066** — Cada registro processado em uma execução de matching possuirá um `matching_result` próprio, independentemente de terem sido encontrados candidatos, separando o resultado global da análise das comparações individuais com candidatos.
- **DP-067** — A classificação individual de cada candidato será separada da conclusão global do matching: candidatos descrevem relações (`EQUIVALENT`, `SIMILAR`, `DIFFERENT`, `INDETERMINATE`), enquanto `matching_result` registra a conclusão da análise do registro.
- **DP-068** — A criação de novo Produto Mestre exigirá que os requisitos mínimos definidos pelo Perfil de Governança para aquela categoria estejam satisfeitos ou explicitamente tratados pela revisão humana; ausência de equivalente não elimina pendências cadastrais.
- **DP-069** — Revisões de DE/PARA preservarão explicitamente a relação de substituição entre o vínculo novo e o anterior, além da inativação lógica e auditoria.
- **DP-070** — A revisão ou substituição de um DE/PARA não alterará automaticamente o status do Produto Mestre envolvido; sua continuidade, correção ou inativação será avaliada separadamente.
- **DP-071** — No MVP 0.1, Produto Mestre manterá seu estado vigente sem versionamento integral de linha; alterações relevantes serão preservadas por eventos de auditoria contendo estado anterior e posterior. Versionamento completo poderá ser introduzido posteriormente se necessário.
- **DP-072** — Indicadores do MVP 0.1 utilizarão prioritariamente o estado vigente dos dados; reconstruções temporais complexas e analytics históricos point-in-time não farão parte do escopo inicial, embora a auditoria preserve informações para evolução futura.
- **DP-073** — A combinação `source_system_id + source_code` será tratada como identidade longitudinal lógica do cadastro de origem, permitindo comparar suas ocorrências entre lotes sem impor unicidade física aos snapshots importados.
- **DP-074** — Alterações entre snapshots do mesmo código de origem serão avaliadas semanticamente segundo o Perfil de Governança; variação textual isolada não caracterizará mudança de identidade, enquanto alteração de atributo relevante ou bloqueador poderá gerar inconsistência para revisão.
- **DP-075** — Mudança material detectada no mesmo identificador longitudinal de origem será tratada como inconsistência a investigar, e não automaticamente como reutilização indevida ou correção legítima do cadastro.
- **DP-076** — O snapshot vigente de um código de origem será determinado pela cronologia dos lotes importados, sem campo redundante `is_current` em `source_records`.
- **DP-077** — Lotes poderão registrar uma `source_reference_date` distinta da data de importação, representando a data/período de referência da base de origem; essa informação terá precedência na determinação cronológica dos snapshots quando disponível.
- **DP-078** — O isolamento entre organizações será imposto no backend e refletido nas relações de dados; filtros de frontend nunca serão considerados mecanismo suficiente de segregação multi-tenant.
- **DP-079** — Relacionamentos críticos capazes de provocar cruzamento entre tenants utilizarão integridade referencial compatível com `organization_id`, além da validação da camada de serviço.
- **DP-080** — Papéis e permissões organizacionais serão associados ao vínculo usuário-organização, e não globalmente ao usuário, permitindo que o mesmo usuário possua responsabilidades distintas em organizações diferentes.
- **DP-081** — A Base Mestre será isolada por organização no MVP; não haverá catálogo mestre global compartilhado automaticamente entre tenants.
- **DP-082** — Toda operação de leitura ou escrita sobre dados organizacionais será autorizada no contexto do tenant; conhecer o identificador UUID de uma entidade não concede acesso a ela.
- **DP-083** — Cada arquivo importado terá um hash de conteúdo armazenado no lote, permitindo detectar reimportações de arquivo binariamente idêntico.
- **DP-084** — Arquivo idêntico previamente importado no mesmo contexto organizacional será detectado antes da criação de novo lote; o MVP evitará duplicação acidental, sem transformar o hash em unicidade global da plataforma.
- **DP-085** — Duplicidade de arquivo será determinada pelo conteúdo, e não pelo nome do arquivo; arquivos com mesmo nome e conteúdos diferentes poderão originar lotes distintos.
- **DP-086** — O MVP 0.1 utilizará hash do arquivo para prevenção de duplicidade exata; fingerprint semântico/normalizado do dataset ficará fora do escopo inicial até existir necessidade comprovada.
- **DP-087** — Operações de processamento possuirão controle explícito de estado para impedir execução concorrente acidental do mesmo estágio sobre o mesmo objeto de trabalho.
- **DP-088** — Falhas técnicas recuperáveis poderão ser reexecutadas sobre o mesmo lote sem exigir nova importação; retries técnicos não representarão novo snapshot da base de origem.
- **DP-089** — Retry técnico e reprocessamento funcional serão conceitos distintos: retry recupera uma execução falha sem representar nova análise de negócio; reprocessamento funcional cria nova execução histórica com contexto, regras ou dados aplicáveis registrados.
- **DP-090** — Execuções funcionais de matching registrarão a origem/motivo do processamento, permitindo distinguir análise inicial, reprocessamento manual, mudança de Perfil de Governança e enriquecimento de dados.
- **DP-091** — O sistema impedirá múltiplas decisões humanas simultaneamente vigentes para o mesmo contexto de análise; nova decisão legítima substituirá explicitamente a anterior.
- **DP-092** — Operações de realização derivadas de uma decisão humana serão protegidas contra duplicação transacional; uma mesma decisão de criação não poderá originar múltiplos Produtos Mestres.
- **DP-093** — A validação transversal do Modelo Físico v0.1 é considerada concluída após os nove cenários de teste; o próximo estágio será sua consolidação técnica final, seguida do congelamento do baseline antes da implementação no PostgreSQL/FastAPI.
- **DP-094** — A documentação técnica consolidada será tratada como especificação de implementação do MVP 0.1; alterações posteriores que afetem arquitetura, modelo de dados ou escopo deverão ser registradas antes de serem incorporadas ao código.
- **DP-095** — O Modelo Físico v0.1 consolidado será composto pelas 26 entidades oficiais definidas na especificação; qualquer nova entidade proposta após o congelamento deverá ser justificada por lacuna funcional concreta e registrada antes de implementação.
- **DP-096** — O documento `docs/modelo-dados-v0.1.md` é homologado como especificação consolidada do Modelo Físico v0.1, contendo as 26 entidades oficiais e as regras estruturais aprovadas até a DP-095.
- **DP-097** — O desenvolvimento do MVP 0.1 será realizado prioritariamente em fatias verticais funcionais e testáveis, integrando progressivamente frontend, backend e banco de dados, em vez de desenvolver cada camada integralmente de forma isolada.

- **DP-098** — O fluxo funcional do Modo 1 será composto pelas etapas Importação → Mapeamento → Validação → Normalização/Interpretação → Matching → Revisão/Decisão Humana → Consolidação → Exportação, preservando separadamente dados originais, resultados processados, recomendações e realizações.

- **DP-099** — As etapas internas do processamento não serão obrigatoriamente convertidas em telas independentes; a interface será organizada por tarefas do usuário, mantendo a granularidade do processo no backend sem reproduzi-la artificialmente na navegação.

- **DP-100** — O backend do MVP 0.1 será estruturado como monólito modular com `core`, `organizations`, `imports`, `governance`, `normalization`, `matching`, `reviews`, `master_data`, `audit` e `exports`, mantendo responsabilidades funcionais explícitas e evitando fragmentação em microserviços ou camadas abstratas sem necessidade comprovada.

- **DP-101** — Regras de negócio e validações de governança serão responsabilidade do backend; routers terão foco na interface HTTP e o frontend não será autoridade para decisões de equivalência, integridade ou realização do saneamento.

- **DP-102** — IA não será tratada como módulo funcional autônomo no MVP 0.1; recursos de IA serão incorporados aos módulos responsáveis pelas capacidades que utilizam essas técnicas, preservando separação entre tecnologia utilizada e responsabilidade de negócio.

- **DP-103** — O frontend do MVP 0.1 será organizado inicialmente nas áreas Importações, Análises, Revisão, Base Mestre, Resultados e Governança, priorizando o fluxo operacional de saneamento em vez de funcionalidades periféricas de apresentação.

- **DP-104** — A Revisão será tratada como área central da experiência do Modo 1, priorizando trabalho por exceção e apresentação de evidências, bloqueadores, pendências e confiança em vez de depender apenas de scores numéricos.

- **DP-105** — A interface completa de configuração do Perfil de Governança não será pré-requisito para a primeira fatia funcional; o núcleo Importar → Analisar → Revisar → Consolidar → Exportar poderá ser validado inicialmente com configuração controlada, mantendo a interface configurável como requisito do MVP.

- **DP-106** — O MVP 0.1 terá desktop/notebook como experiência principal, com responsividade básica; mobile-first e aplicativo móvel não fazem parte do objetivo inicial.

- **DP-107** — A comunicação entre frontend e backend utilizará API REST versionada sob `/api/v1`; JSON será o formato padrão de dados, com `multipart/form-data` para uploads e respostas de arquivo para exportações.

- **DP-108** — O frontend não acessará PostgreSQL diretamente nem será autoridade de regras de negócio; toda operação funcional será mediada pelo backend FastAPI.

- **DP-109** — Contratos da API serão orientados aos casos de uso e não ao espelhamento direto das tabelas do banco; modelo físico, contrato de API e modelo de apresentação serão tratados como representações distintas.

- **DP-110** — Operações potencialmente demoradas possuirão estados explícitos de processamento, permitindo iniciar de forma síncrona e evoluir posteriormente para execução assíncrona sem alterar o conceito funcional da interface.

- **DP-111** — Erros da API utilizarão estrutura padronizada com código estável, mensagem legível e detalhes opcionais, permitindo ao frontend distinguir erros técnicos, validações, regras de negócio e autorização.

- **DP-112** — Listagens potencialmente volumosas utilizarão paginação e filtros desde a primeira implementação aplicável, evitando transferência integral de grandes bases para o frontend.

- **DP-113** — O contexto organizacional será validado pelo backend em todas as operações multi-tenant; identificadores fornecidos pelo cliente nunca serão considerados prova suficiente de autorização.

- **DP-114** — A implementação do MVP 0.1 será dividida em seis fatias verticais: Fundação Técnica, Importação, Normalização/Atributos, Matching, Revisão/Base Mestre e Resultados/Exportação. Cada fatia deverá terminar em incremento executável e validável antes da próxima.

- **DP-115** — Similaridade semântica/embeddings não será introduzida antes da existência de uma baseline funcional baseada em normalização, similaridade lexical e regras de governança, permitindo medir objetivamente o ganho da técnica semântica.

- **DP-116** — A primeira implementação de cada capacidade priorizará a solução mais simples que preserve as regras de negócio; infraestrutura ou abstrações adicionais somente serão introduzidas quando testes ou requisitos demonstrarem necessidade concreta.