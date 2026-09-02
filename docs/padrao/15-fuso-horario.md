# Datas e Fuso Horário

## Contrato

- instantes são persistidos como `TIMESTAMPTZ` em UTC;
- API transmite instantes em ISO 8601 com offset ou `Z`;
- frontend apresenta em `America/Sao_Paulo` quando o usuário não possuir preferência futura;
- datas civis sem horário usam `DATE` e não sofrem conversão de fuso;
- jobs e logs técnicos usam UTC;
- `created_at` e `updated_at` representam instantes reais.

## Aplicação

- backend trabalha com objetos timezone-aware;
- não persistir datetime ingênuo;
- não cortar string de timestamp para obter data local;
- comparações cronológicas acontecem com instantes normalizados;
- `source_reference_date` permanece data/período de negócio conforme o modelo;
- testes incluem transição de dia entre UTC e São Paulo.

## Apresentação

Usar APIs de internacionalização com locale `pt-BR`. Não alterar o valor persistido para formatar a tela ou exportação.

