# Lookups entre Módulos

## Conceito

Lookup é uma consulta pequena para seleção ou filtro. Não é autorização implícita para acessar o CRUD completo do módulo fornecedor.

## Regras

- endpoint explícito, como `/meta`, `/options` ou equivalente de domínio;
- retorno mínimo: identificador, rótulo e metadados indispensáveis;
- busca, limite e paginação para conjuntos grandes;
- somente registros ativos e pertencentes ao tenant;
- autorização considera o caso de uso consumidor;
- não reutilizar endpoint administrativo para preencher select operacional;
- não carregar catálogo inteiro na abertura da página.

## Segurança

- a permissão da tela consumidora pode autorizar um lookup específico sem conceder CRUD no módulo fornecedor;
- tenant e visibilidade são aplicados no backend;
- IDs enviados depois são revalidados no caso de uso de escrita;
- lookup não comprova que o usuário pode alterar a entidade selecionada.

## Checklist

- endpoint e contrato estão documentados;
- query é parametrizada e limitada;
- busca não permite enumeração entre organizações;
- índice suporta filtros usados;
- frontend trata busca, loading, vazio e erro;
- teste cobre acesso autorizado e tenant diferente.

