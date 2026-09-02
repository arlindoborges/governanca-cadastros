# Processo de Trabalho

## 1. Briefing mínimo

Antes de implementar, deixar explícitos:

- objetivo verificável;
- módulos e arquivos em escopo;
- itens deliberadamente fora do escopo;
- contratos, regras e fluxos que não podem quebrar;
- critérios de aceite;
- comandos de validação aplicáveis.

O briefing pode estar na solicitação, plano de trabalho ou issue. Não é obrigatório criar um documento por tarefa.

## 2. Princípios

- Executar apenas o escopo autorizado.
- Preservar alterações preexistentes do usuário.
- Trabalhar em incrementos executáveis e testáveis.
- Não corrigir problemas adjacentes sem autorização.
- Não alterar contrato público, arquitetura ou modelo físico silenciosamente.
- Não adicionar abstração ou infraestrutura sem necessidade demonstrada.
- Bugs corrigidos devem ganhar teste de regressão quando o custo for proporcional.

## 3. Fluxo de execução

1. Ler as fontes canônicas relacionadas ao escopo.
2. Inspecionar o código e o estado do Git.
3. Definir plano curto quando houver múltiplos componentes.
4. Implementar em fatias pequenas.
5. Rodar validação incremental do componente afetado.
6. Rodar o gate final proporcional ao risco.
7. Conferir o diff e remover artefatos temporários.
8. Entregar resumo, arquivos afetados, validações e pendências reais.

## 4. Critérios universais de aceite

- contratos de API preservados ou alterados de forma homologada;
- regras de negócio concentradas no backend;
- autorização e tenant validados no backend;
- nenhuma credencial ou dado real versionado;
- erros seguem o envelope oficial;
- listagens volumosas são paginadas no banco;
- acessibilidade básica e estados de carregamento/erro presentes;
- migrations aplicam em banco vazio e preservam dados existentes;
- lint, typecheck, testes e build aplicáveis passam;
- documentação é atualizada quando uma decisão duradoura muda.

## 5. Entrega obrigatória

Ao concluir uma mudança, informar:

1. resultado alcançado;
2. arquivos criados, alterados ou removidos;
3. validações executadas e seus resultados;
4. riscos ou limitações ainda existentes;
5. próximo passo somente quando útil.

Não declarar sucesso quando testes essenciais não puderam ser executados.

## 6. Limites de tamanho

Limites são sinais de revisão, não metas artificiais:

- página ou composição principal: até 400 linhas;
- componente visual: até 250 linhas;
- hook: até 200 linhas;
- router: até 200 linhas;
- service ou repository: até 400 linhas.

Ao ultrapassar, dividir por responsabilidade de negócio. Não fragmentar apenas para satisfazer contagem.

