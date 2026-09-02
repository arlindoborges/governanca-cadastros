# Segurança e Invariantes

## 1. Princípios inegociáveis

- autorização deny-by-default;
- autenticação não implica acesso a qualquer organização;
- tenant derivado da sessão autorizada, nunca confiado apenas a body/query/header do cliente;
- dados fora do escopo retornam `404` quando revelar existência causar IDOR;
- SQL sempre parametrizado por SQLAlchemy/Psycopg;
- dados de origem e auditoria funcional não são sobrescritos;
- segredos não entram em código, imagem, log ou repositório;
- frontend melhora a experiência, mas não é fronteira de segurança.

## 2. Autenticação

A estratégia definitiva ainda depende de decisão homologada. Até lá:

- identidade de desenvolvimento só pode funcionar em ambiente local explícito;
- nenhuma configuração local pode ser aceita em produção;
- tokens não devem ser persistidos em `localStorage`;
- respostas de login/sessão devem conter somente dados necessários;
- JWT, se adotado, terá payload mínimo;
- mensagens de falha não devem permitir enumeração de contas.

Uma opção candidata para o ADR é access token curto em memória, refresh token rotativo em cookie `HttpOnly`, `Secure` e `SameSite`, com detecção de reutilização. Ela não é considerada implementada ou homologada por este documento.

## 3. CSRF e CORS

- autenticação baseada em cookie exige proteção CSRF para métodos mutáveis;
- CORS usa allowlist explícita por ambiente;
- não usar `*` com credenciais;
- origem local é separada da configuração de produção.

## 4. Permissões e multi-tenancy

- papéis e permissões pertencem a `organization_users`;
- todas as operações tenant-owned validam vínculo ativo;
- listagens, contagens, exports e lookups respeitam o mesmo escopo;
- UUID conhecido não concede acesso;
- filtros do cliente apenas restringem, nunca ampliam o escopo;
- testes negativos cobrem leitura, escrita, upload, download e exportação cruzando tenants.

## 5. Uploads

- limitar tamanho antes ou durante o streaming;
- validar extensão, MIME, assinatura/conteúdo e estrutura;
- normalizar nome com basename e nunca concatenar caminho fornecido pelo cliente;
- garantir que temporários permaneçam no diretório previsto;
- calcular SHA-256 durante a leitura;
- remover arquivo temporário após sucesso e em toda rejeição/falha;
- limitar quantidade de linhas, colunas e expansão de arquivos compactados;
- planilha inválida gera erro funcional seguro, sem stack trace.

## 6. HTTP e aplicação

- TLS obrigatório em produção;
- headers de segurança definidos em uma única camada responsável;
- ocultar versões de servidor/framework;
- CSP restritiva compatível com Next.js;
- rate limit dedicado para autenticação e upload;
- `request_id` em erros e logs;
- stack trace apenas em log técnico controlado, nunca na resposta de produção.

## 7. Envelope de erro

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Mensagem segura e compreensível.",
    "details": {},
    "request_id": "uuid"
  }
}
```

Não retornar SQL, path interno, segredo, conteúdo sensível do arquivo ou detalhes de outro tenant.

## 8. Dependências e containers

- imagens executam como usuário não root;
- imagem final não contém toolchain desnecessária;
- dependências são fixadas por lockfile e auditadas;
- banco não é exposto publicamente em produção;
- secrets são injetados pela plataforma;
- filesystem do container é tratado como efêmero.

