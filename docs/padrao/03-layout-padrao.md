# Padrão de Interface

## 1. Objetivo

A interface deve apoiar trabalho operacional de saneamento, com desktop/notebook como experiência principal e responsividade básica.

## 2. Áreas

- Importações;
- Análises;
- Revisão;
- Base Mestre;
- Resultados;
- Governança.

As etapas internas do processamento não precisam virar uma tela por etapa. A navegação é organizada por tarefas do usuário.

## 3. Revisão por exceção

A tela central deve apresentar:

- registro original e seus dados imutáveis;
- candidato comparado;
- atributos normalizados ou confirmados;
- evidências e proveniência;
- bloqueadores e informações ausentes;
- classe da relação e confiança separadamente;
- decisão disponível e consequência explícita.

Score agregado não pode esconder bloqueador, pendência ou baixa suficiência de evidência.

## 4. Componentes

- páginas orquestram e não concentram regras;
- componentes visuais não acessam a API diretamente;
- padrões repetidos pela segunda vez devem virar componente compartilhado;
- selects remotos usam busca paginada e debounce;
- listas grandes nunca carregam tudo para paginar no navegador;
- modais complexos são divididos em seções ou passos claros;
- ações destrutivas ou irreversíveis exigem confirmação proporcional ao impacto.

## 5. Estados obrigatórios

Toda experiência remota deve tratar carregamento, vazio real, erro, sucesso e permissão negada. Processamentos longos devem mostrar estado persistido e permitir retomada da consulta.

## 6. Acessibilidade

- navegação por teclado;
- foco visível;
- label associado aos campos;
- mensagens de erro ligadas ao campo;
- contraste adequado;
- não comunicar resultado somente por cor;
- tabelas com cabeçalhos semânticos;
- ações com nome acessível.

## 7. Formatação

- datas exibidas em `America/Sao_Paulo`;
- números seguem localidade `pt-BR` na apresentação;
- valores persistidos e transportados permanecem em formatos canônicos;
- códigos, unidades e descrições não são alterados apenas para apresentação sem regra explícita.

