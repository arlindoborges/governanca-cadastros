# Linguagens, Contratos e Dependências

## 1. Stack obrigatória

### Frontend

- Next.js com App Router;
- React e TypeScript em modo estrito;
- `.tsx` apenas quando houver JSX;
- npm e `package-lock.json` como gerenciador e lockfile;
- Server Components por padrão;
- Client Components apenas quando interação no navegador exigir.

### Backend

- Python com FastAPI;
- Pydantic para contratos;
- SQLAlchemy 2 e Psycopg 3 para PostgreSQL;
- Alembic para migrations;
- `uv`, `pyproject.toml` e `uv.lock` para dependências;
- Ruff e Pytest para qualidade.

### Banco e infraestrutura

- PostgreSQL 18;
- Dockerfiles independentes e Docker Compose no desenvolvimento;
- YAML apenas para configuração de infraestrutura e CI;
- scripts auxiliares em Python ou PowerShell conforme o ambiente, sem duplicar regra de negócio.

## 2. Contratos públicos

São contratos públicos:

- rotas, métodos, parâmetros, payloads, status e códigos de erro da API;
- schema OpenAPI;
- props exportadas por componentes compartilhados;
- variáveis de ambiente documentadas;
- estrutura de arquivos importados e exportados;
- estados persistidos usados por integrações.

Alterações incompatíveis exigem decisão explícita e atualização coordenada de documentação, testes e consumidores.

## 3. Contrato entre Python e TypeScript

FastAPI/Pydantic gera o OpenAPI. O frontend consome tipos gerados em `frontend/src/generated/`.

- não duplicar manualmente tipos de resposta;
- não importar código Python no frontend;
- não expor modelos SQLAlchemy diretamente como contrato HTTP;
- não editar arquivos gerados manualmente;
- regenerar o cliente e rodar typecheck quando o OpenAPI mudar.

## 4. Dependências

- Preferir biblioteca padrão e dependências já aprovadas.
- Toda nova dependência precisa de função concreta, manutenção ativa e licença compatível.
- Fixar versões no lockfile.
- Não introduzir duas bibliotecas para o mesmo papel sem plano de remoção.
- Dependência de IA, fila, storage ou busca vetorial exige decisão arquitetural específica.

