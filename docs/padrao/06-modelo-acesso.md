# Modelo de Acesso e Escopo Organizacional

## 1. Conceitos

- `users`: identidade da pessoa;
- `organizations`: tenant proprietário dos dados;
- `organization_users`: vínculo, papel, status e permissões no contexto da organização.

O mesmo usuário pode possuir responsabilidades distintas em organizações diferentes.

## 2. Formação do contexto

Para cada requisição autenticada:

1. identificar o usuário;
2. resolver a organização selecionada;
3. validar vínculo ativo em `organization_users`;
4. carregar papel/permissões daquele vínculo;
5. formar um `TenantContext` imutável para a requisição;
6. repassar o contexto aos serviços e repositories.

O identificador enviado pelo frontend nunca é prova suficiente de acesso.

## 3. Autorização

Permissão funcional e escopo organizacional são gates independentes.

```text
autenticado
  -> vínculo ativo com a organização
    -> permissão funcional
      -> objeto pertence à organização
        -> operação permitida
```

Ausência de configuração significa negação. Administrador de uma organização não se torna administrador global.

## 4. Semântica HTTP

- `401`: identidade ausente ou inválida;
- `403`: usuário autenticado sem permissão funcional ou sem acesso à organização explicitamente selecionada;
- `404`: recurso por identificador não existe ou está fora do tenant, evitando enumeração;
- `409`: conflito de estado ou concorrência;
- `422`: entrada estruturalmente válida, mas incompatível com validação do caso de uso.

## 5. Persistência

- consultas tenant-owned recebem `organization_id` obrigatoriamente;
- relacionamentos críticos usam integridade referencial compatível com `organization_id`;
- índices iniciam por `organization_id` quando o padrão de consulta exigir;
- exports, auditoria e contagens aplicam o mesmo escopo;
- RLS pode ser defesa adicional futura, não substituto da aplicação.

## 6. Testes obrigatórios

Para cada módulo tenant-owned:

- usuário A acessa dado da organização A;
- usuário A não lê UUID da organização B;
- usuário A não altera nem exclui dado da organização B;
- filtros não ampliam escopo;
- lookup não vaza opções;
- upload/export não revela existência nem conteúdo de outra organização;
- operação negada deixa o banco inalterado.

