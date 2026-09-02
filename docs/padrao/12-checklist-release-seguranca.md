# Checklist de Release e Segurança

## Aplicação

- [ ] frontend e backend foram construídos a partir do commit candidato;
- [ ] OpenAPI e cliente TypeScript estão sincronizados;
- [ ] migrations aplicam do zero e no caminho de atualização suportado;
- [ ] smoke tests da API passaram;
- [ ] E2E dos fluxos afetados passou;
- [ ] testes de multi-tenancy/IDOR aplicáveis passaram;
- [ ] nenhuma baseline cresceu;
- [ ] nenhum dado, segredo ou arquivo local entrou no diff.

## HTTP e autenticação

- [ ] TLS está ativo;
- [ ] CORS possui allowlist correta;
- [ ] cookies, se usados, possuem `HttpOnly`, `Secure` e `SameSite` apropriados;
- [ ] CSRF protege mutações baseadas em cookie;
- [ ] rate limit protege autenticação e upload;
- [ ] headers de segurança existem sem duplicidade entre camadas;
- [ ] respostas não expõem versão, stack trace ou detalhes internos.

## Dados

- [ ] backup recente está disponível;
- [ ] procedimento de restauração é conhecido;
- [ ] migrations destrutivas usam implantação em etapas;
- [ ] queries e constraints preservam `organization_id`;
- [ ] auditoria de negócio permanece append-only;
- [ ] rollback da aplicação é compatível com o schema implantado.

## Containers e operação

- [ ] imagens usam versões fixadas e usuário não root;
- [ ] segredos são injetados pela plataforma;
- [ ] `/health/live` e `/health/ready` respondem corretamente;
- [ ] logs estruturados e `request_id` estão visíveis;
- [ ] banco não está publicado na internet;
- [ ] temporários de upload são removidos em sucesso e falha.

Release com item crítico não atendido exige correção ou risco formalmente aceito conforme severidade.

