# Severidade de Segurança

## P0 — Crítica

Exemplos: bypass de autenticação, acesso entre tenants, execução remota, SQL injection, segredo de produção versionado, corrupção irreversível.

Resposta: interromper release, conter exposição, corrigir imediatamente, testar regressão e registrar incidente/decisão.

## P1 — Alta

Exemplos: IDOR limitado, elevação de permissão, upload gravável fora do diretório, token reutilizável indevidamente, exportação com vazamento.

Resposta: bloquear release afetado, corrigir prioritariamente e adicionar teste.

## P2 — Média

Exemplos: rate limit ausente em endpoint crítico, header relevante ausente, mensagem com detalhes internos, validação de arquivo incompleta sem exploração demonstrada.

Resposta: corrigir antes do próximo release ou registrar risco aceito com prazo e responsável.

## P3 — Baixa

Exemplos: hardening adicional, redução de metadados, melhoria defensiva sem exploração prática no contexto atual.

Resposta: planejar e acompanhar; não mascarar como concluído.

## Regras

- severidade considera impacto, explorabilidade, alcance entre tenants e exposição;
- ausência de evidência não reduz automaticamente a severidade;
- risco aceito exige registro em `11-riscos-aceitos.md`;
- correção não é concluída sem teste de regressão proporcional.

