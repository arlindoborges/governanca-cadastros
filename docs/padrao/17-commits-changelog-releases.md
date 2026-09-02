# Commits, Changelog e Releases

## Commits

Adotar Conventional Commits:

```text
feat(imports): adicionar mapeamento de colunas
fix(matching): respeitar atributo bloqueador ausente
docs(architecture): registrar estratégia de autenticação
```

Tipos usuais: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`.

- assunto curto, imperativo e específico;
- um commit deve representar uma intenção coerente;
- não incluir segredo, dados reais ou artefatos gerados indevidos;
- mudanças de schema incluem migration e testes relacionados;
- não criar commit, push, tag ou release sem autorização do usuário.

## Changelog

Registrar apenas mudanças relevantes para operadores ou usuários:

- criação de capacidade;
- melhoria perceptível;
- correção funcional;
- mudança de compatibilidade ou operação.

Refatoração interna, formatação e testes sem efeito externo podem ser omitidos.

## Release

- versão e estratégia de versionamento serão homologadas antes do primeiro deploy;
- release usa artefatos construídos pelo CI;
- migrations executam como etapa única;
- checklist de segurança é obrigatório;
- notas distinguem mudanças, correções, migrações e riscos conhecidos;
- rollback considera compatibilidade entre aplicação e schema.

