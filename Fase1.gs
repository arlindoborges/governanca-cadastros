/**
 * ============================================================
 * FASE 1 — SANEAMENTO DE CADASTROS v1.2
 * ============================================================
 *
 * Entrada:  aba Cadastros, coluna A (DESCRICAO_ORIGINAL)
 * Saída:    aba Cadastros, coluna B (DESCRICAO_SANEADA)
 *
 * Esta versão é autossuficiente: todas as regras homologadas
 * dos Passos 01 a 11 estão incorporadas no próprio código.
 * Não depende de abas de dicionário ou diagnóstico.
 *
 * REGRA DE GOVERNANÇA:
 * - a coluna A nunca é alterada;
 * - a coluna B é sempre reconstruída a partir da coluna A;
 * - as regras abaixo são o padrão oficial da Fase 1 v1.0.
 * ============================================================
 */

const FASE1_CONFIG = Object.freeze({
  VERSAO: '1.2',
  ABA_CADASTROS: 'Cadastros',
  LINHA_INICIAL: 2,
  COLUNA_ORIGINAL: 1,
  COLUNA_SANEADA: 2,
  CABECALHO_ORIGINAL: 'DESCRICAO_ORIGINAL',
  CABECALHO_SANEADA: 'DESCRICAO_SANEADA'
});

const FASE1_IDENTIFICADORES_PROTEGIDOS = Object.freeze([
  'DS-K1T673DX-BR','DS-K3G200LX-R','AVA1500-60-1P','AA-PBUN3AB','DS-KAB6-ZUI',
  'DS-K7P04','SA400S37','1202SFX','BCM57810S','JBLC50HIBLK','MLB4389589506',
  'NP350XAA','PZ6029FX','DTC1250E','A.P.HD585','AC1300','AP1000T','4103FDW',
  'I5-7400T','TBES200H','AA-PBUN3AB','55DU8000','FC-6S','SM-X115','C920E',
  'C-1000','CDC-10','PFL6520','LTH1842','MK120','MZ560','NVR08','R730XD',
  'UE300C','WD19S','Z560X','H730P','JL685A','NP350XAA','PZ6029FX','120U','240H',
  '800X','A06','A33','A260','B-173','BR420','C-10','C-15','C15','C621B','CAT6',
  'CDC10','CF300','CI3','CJ24','CR80','DA17','DDR4','DDR5','DP722','EC52','EK221Q',
  'F307','FH52','FS220','G04S','G05','G06','H2D2','HD585','IM5','K3XX','K20A',
  'M90','MCB-045','MK2','MZ52','MZ54','N20KJ','NT200','NT3000','NV3','P05','P10',
  'PU40','PX-29','PZ60','RC2','RJ45','RT-14','RZ4824F','SR420','T3UU','T20A','TC310',
  'WD40','X115'
].filter((v, i, a) => a.indexOf(v) === i).sort((a,b) => b.length - a.length));

const FASE1_CORES_SIMPLES = Object.freeze([
  { cor:'AZUL', familia:'AZUL' },
  { cor:'BRANCO', familia:'BRANCO' },
  { cor:'BRANCA', familia:'BRANCO' },
  { cor:'VERDE', familia:'VERDE' },
  { cor:'PRETO', familia:'PRETO' },
  { cor:'PRETA', familia:'PRETO' },
  { cor:'CINZA', familia:'CINZA' },
  { cor:'LARANJA', familia:'LARANJA' },
  { cor:'VERMELHO', familia:'VERMELHO' },
  { cor:'VERMELHA', familia:'VERMELHO' },
  { cor:'AMARELO', familia:'AMARELO' },
  { cor:'AMARELA', familia:'AMARELO' },
  { cor:'TRANSPARENTE', familia:'TRANSPARENTE' },
  { cor:'INCOLOR', familia:'INCOLOR' },
  { cor:'MARROM', familia:'MARROM' },
  { cor:'BEGE', familia:'BEGE' },
  { cor:'ROSA', familia:'ROSA' }
].sort((a,b) => b.cor.length - a.cor.length));

const FASE1_CORES_COMPOSTAS = Object.freeze([
  'AZUL MARINHO','AZUL CLARO','AZUL ROYAL','CINZA CHUMBO','CINZA MESCLADO',
  'CINZA CLARO','VERDE BANDEIRA','VERDE OLIVA','BRANCO LEITOSO'
].sort((a,b) => b.length - a.length));

const FASE1_MARCAS = Object.freeze([
  { termo:'STIHL', tipo:'MARCA' },
  { termo:'BIC', tipo:'MARCA' },
  { termo:'DELL', tipo:'MARCA' },
  { termo:'SAMSUNG', tipo:'MARCA' },
  { termo:'INTELBRAS', tipo:'MARCA' },
  { termo:'INTEL', tipo:'MARCA' },
  { termo:'KINGSTON', tipo:'MARCA' },
  { termo:'LOGITECH', tipo:'MARCA' },
  { termo:'SPARTAN', tipo:'MARCA' },
  { termo:'KARCHER', tipo:'MARCA' },
  { termo:'JACTO', tipo:'MARCA' },
  { termo:'EKKOA', tipo:'MARCA' },
  { termo:'MARINE FRESH', tipo:'LINHA_COMERCIAL' },
  { termo:'SOLV FRESH', tipo:'LINHA_COMERCIAL' },
  { termo:'CLEAN GLASS', tipo:'LINHA_COMERCIAL' },
  { termo:'WHITE CLEAN', tipo:'LINHA_COMERCIAL' },
  { termo:'CLEAN BY PEROXI', tipo:'LINHA_COMERCIAL' },
  { termo:'YELLOW PINE', tipo:'LINHA_COMERCIAL' },
  { termo:'POWER PINE', tipo:'LINHA_COMERCIAL' },
  { termo:'BOWL CLEANSE', tipo:'LINHA_COMERCIAL' },
  { termo:'COSTA OESTE', tipo:'IDENTIFICACAO_INTERNA' },
  { termo:'GRABIN', tipo:'IDENTIFICACAO_INTERNA' },
  { termo:'GRAGIN', tipo:'IDENTIFICACAO_INTERNA' },
  { termo:'FACILITIES', tipo:'IDENTIFICACAO_INTERNA' },
  { termo:'FACILITEIS', tipo:'IDENTIFICACAO_INTERNA' },
  { termo:'FILIAL', tipo:'MARCADOR_LEGADO' }
].sort((a,b) => b.termo.length - a.termo.length));

const FASE1_TAMANHOS = Object.freeze([
  'EXXG','EXGG','XXG','XGG','EXG','EGG','GG','G1','G2','G3','G4','G5','EG','PP','XG','P','M','G'
]);

/** Execução oficial da Fase 1. */
function executarSaneamento() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = prepararAbaCadastrosFase1_(ss);
  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < FASE1_CONFIG.LINHA_INICIAL) {
    SpreadsheetApp.getUi().alert(
      'A aba Cadastros está pronta.\n\nCole as descrições originais na coluna A a partir da linha 2 e execute novamente.'
    );
    return;
  }

  const quantidade = ultimaLinha - FASE1_CONFIG.LINHA_INICIAL + 1;
  const dados = aba.getRange(
    FASE1_CONFIG.LINHA_INICIAL,
    FASE1_CONFIG.COLUNA_ORIGINAL,
    quantidade,
    1
  ).getDisplayValues();

  const resultado = dados.map(([original]) => [sanearDescricaoFase1_(original)]);

  aba.getRange(1, FASE1_CONFIG.COLUNA_SANEADA).setValue(FASE1_CONFIG.CABECALHO_SANEADA);
  aba.getRange(
    FASE1_CONFIG.LINHA_INICIAL,
    FASE1_CONFIG.COLUNA_SANEADA,
    resultado.length,
    1
  ).setValues(resultado);

  SpreadsheetApp.getUi().alert(
    'Fase 1 v' + FASE1_CONFIG.VERSAO + ' concluída.\n\n' +
    resultado.length + ' cadastros processados.\n' +
    'Resultado gravado em Cadastros!B.'
  );
}

/** Cria somente a aba essencial se ela não existir. */
function prepararAbaCadastrosFase1_(ss) {
  let aba = ss.getSheetByName(FASE1_CONFIG.ABA_CADASTROS);
  if (!aba) aba = ss.insertSheet(FASE1_CONFIG.ABA_CADASTROS);

  const a1 = String(aba.getRange(1,1).getDisplayValue() || '').trim();
  if (!a1) aba.getRange(1,1).setValue(FASE1_CONFIG.CABECALHO_ORIGINAL);

  const b1 = String(aba.getRange(1,2).getDisplayValue() || '').trim();
  if (!b1) aba.getRange(1,2).setValue(FASE1_CONFIG.CABECALHO_SANEADA);

  return aba;
}

/** Pipeline homologado dos Passos 01 a 11. */
function sanearDescricaoFase1_(descricaoOriginal) {
  if (descricaoOriginal === null || descricaoOriginal === undefined || String(descricaoOriginal).trim() === '') return '';

  let texto = normalizarEspacos_(descricaoOriginal);
  texto = removerAcentuacaoFase1_(texto);
  texto = String(texto).toUpperCase();

  const pId = protegerIdentificadores_(texto);
  texto = pId.texto;

  const pTam = protegerTamanhosUniformeEPI_(texto);
  texto = pTam.texto;

  const pBarra = protegerPBarra_(texto);
  texto = pBarra.texto;

  texto = normalizarUnidadesQuantidades_(texto);                 // Passo 03
  texto = normalizarEspecificacoesTecnicas_(texto);              // Passo 04
  texto = normalizarDimensoesMultiplicadores_(texto);            // Passo 05
  texto = normalizarEmbalagemLogistica_(texto);                  // Passo 06
  texto = restaurarMapa_(texto, pBarra.mapa);                    // restaura P/
  texto = normalizarAbreviacoesBarra_(texto);                    // Passo 07
  texto = normalizarTamanhosNumericosUniformeEPI_(texto);        // Passo 08A
  texto = normalizarPontuacao_(texto);                           // Passo 08B
  texto = normalizarCaracteresEspeciais_(texto);                 // Passo 08C
  texto = restaurarMapa_(texto, pTam.mapa);                      // restaura tamanhos
  texto = normalizarPosicaoCores_(texto);                        // Passo 09
  texto = reposicionarMarcas_(texto);                            // Passo 10
  texto = normalizarEstruturaSegura_(texto);                     // Passo 11
  texto = restaurarMapa_(texto, pId.mapa);                       // restaura identificadores
  texto = normalizarSemanticaSeguraFase1_(texto);                // Passo 12 — semântica segura v1.2

  return normalizarEspacos_(texto);
}

function normalizarEspacos_(texto) {
  return String(texto).trim().replace(/\s+/g, ' ');
}

/**
 * Normaliza acentuação para o padrão oficial da Fase 1.
 * Inclui tratamento explícito de Ç/ç para C/c.
 */
function removerAcentuacaoFase1_(texto) {
  return String(texto)
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escaparRegex_(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// PASSO 02 — IDENTIFICADORES PROTEGIDOS
// ============================================================
function protegerIdentificadores_(texto) {
  let resultado = String(texto);
  const mapa = {};
  let contador = 0;

  FASE1_IDENTIFICADORES_PROTEGIDOS.forEach(identificador => {
    const regex = new RegExp(
      '(^|[^A-Z0-9])(' + escaparRegex_(identificador) + ')(?=$|[^A-Z0-9])',
      'g'
    );

    resultado = resultado.replace(regex, function(match, prefixo) {
      const chave = 'ZZID' + String(contador).padStart(5,'0') + 'ZZ';
      mapa[chave] = identificador;
      contador++;
      return prefixo + chave;
    });
  });

  return { texto: resultado, mapa };
}

function restaurarMapa_(texto, mapa) {
  let resultado = String(texto);
  Object.keys(mapa).forEach(chave => {
    resultado = resultado.split(chave).join(mapa[chave]);
  });
  return resultado;
}

// ============================================================
// CONTEXTO DE UNIFORME / EPI
// ============================================================
function ehContextoUniformeEPI_(descricao) {
  const termos = [
    'CAMISA','CAMISETA','CAMISETE','BABY LOOK','BLUSA','BLAZER','SUETER',
    'CALCA','CALÇA','BERMUDA','JAQUETA','CONJUNTO COPEIRA','CONJUNTO PIJAMA',
    'CONJUNTO PVC','GANDOLA','GRAVATA','LENCO','LENÇO','JALECO','AVENTAL','TOUCA',
    'LUVA','BOTA','BOTINA','SAPATO','TENIS','COLETE','UNIFORME','EPI','CAPACETE',
    'MASCARA','RESPIRADOR','OCULOS','PROTETOR','PERNEIRA'
  ];
  const texto = String(descricao).toUpperCase();
  return termos.some(termo => texto.includes(termo));
}

function protegerTamanhosUniformeEPI_(texto) {
  const descricao = String(texto).toUpperCase();
  if (!ehContextoUniformeEPI_(descricao)) return { texto: descricao, mapa: {} };

  let resultado = descricao;
  const mapa = {};
  let contador = 0;

  FASE1_TAMANHOS.slice().sort((a,b)=>b.length-a.length).forEach(tamanho => {
    const regex = new RegExp(
      '(^|\\s)(' + escaparRegex_(tamanho) + ')(?=$|\\s|[(),;])',
      'g'
    );

    resultado = resultado.replace(regex, function(match, prefixo, valor, offset, stringCompleta) {
      if (['G','M','P'].includes(valor)) {
        const inicioValor = offset + prefixo.length;
        const antes = stringCompleta.substring(0, inicioValor).trimEnd();
        if (/\d(?:[.,]\d+)?\s*$/.test(antes)) return match;
      }

      const chave = 'ZZTAM' + String(contador).padStart(5,'0') + 'ZZ';
      mapa[chave] = valor;
      contador++;
      return prefixo + chave;
    });
  });

  return { texto: resultado, mapa };
}

function protegerPBarra_(texto) {
  let resultado = String(texto);
  const mapa = {};
  let contador = 0;

  resultado = resultado.replace(/\bP\/\s*/g, function() {
    const chave = 'ZZPBARRA' + String(contador).padStart(4,'0') + 'ZZ';
    mapa[chave] = 'P/ ';
    contador++;
    return chave;
  });

  return { texto: resultado, mapa };
}

// ============================================================
// PASSO 03 — UNIDADES E QUANTIDADES
// ============================================================
function normalizarUnidadesQuantidades_(texto) {
  let resultado = String(texto);

  const conversoes = [
    ['FOLHAS','FL'],['FOLHA','FL'],['FLS','FL'],
    ['UNID','UN'],['UND','UN'],
    ['PCT','PC'],['PCS','PC'],
    ['GRS','G'],['GR','G'],
    ['LITROS','LT'],['LITRO','LT'],['LTS','LT'],
    ['METROS','MT'],['METRO','MT'],['MTS','MT']
  ];

  conversoes.forEach(([origem,destino]) => {
    const regex = new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + origem + '\\b','g');
    resultado = resultado.replace(regex, '$1 ' + destino);
  });

  const unidades = ['KG','G','ML','LT','KM','MT','CM','MM','UN','PC','FL','CX'];
  unidades.slice().sort((a,b)=>b.length-a.length).forEach(unidade => {
    const regex = new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + unidade + '\\b','g');
    resultado = resultado.replace(regex, '$1 ' + unidade);
  });

  resultado = resultado.replace(/(\d+(?:[.,]\d+)?)\s*L\b/g, '$1 LT');
  resultado = resultado.replace(/(\d+(?:[.,]\d+)?)\s*M\b/g, '$1 MT');

  return normalizarEspacos_(resultado);
}

// ============================================================
// PASSO 04 — ESPECIFICAÇÕES TÉCNICAS
// ============================================================
function normalizarEspecificacoesTecnicas_(texto) {
  let resultado = String(texto);

  resultado = resultado.replace(/\b(\d{4,})\s*MT\s*\/\s*S\b/g, function(match, numero) {
    return formatarMilharTecnico_(numero) + 'MT/S';
  });
  resultado = resultado.replace(/\b(\d{1,3})\s*MT\s*\/\s*S\b/g, '$1MT/S');

  const preservados = {};
  let contador = 0;
  function proteger(regex) {
    resultado = resultado.replace(regex, match => {
      const chave = 'ZZTEC' + String(contador).padStart(5,'0') + 'ZZ';
      preservados[chave] = match;
      contador++;
      return chave;
    });
  }

  proteger(/\b\d{1,2}W\d{2}\b/g);
  proteger(/\bPFF-?\d+\b/g);
  proteger(/\b\d{1,3}(?:\.\d{3})*MT\/S\b/g);

  resultado = resultado.replace(
    /\b(\d{1,3})\s+000\s*(BTUS?|RPM|MAH|W|KW|K|HZ|GHZ|MHZ|KHZ)\b/g,
    '$1000$2'
  );

  const siglas = [
    'BTUS','BTU','KV','V','KW','W','MAH','AH','AMP','A','OHMS','OHM','GHZ','MHZ',
    'KHZ','HZ','GBPS','MBPS','TB','GB','MB','DBI','DB','AWG','RPM','MP','MS','P','K'
  ];

  siglas.slice().sort((a,b)=>b.length-a.length).forEach(sigla => {
    const regex = new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + escaparRegex_(sigla) + '\\b','g');
    resultado = resultado.replace(regex, '$1' + sigla);
  });

  const regexMilhar = new RegExp(
    '\\b(\\d{4,})(?=(' + siglas.map(escaparRegex_).join('|') + ')\\b)',
    'g'
  );
  resultado = resultado.replace(regexMilhar, numero => formatarMilharTecnico_(numero));

  resultado = restaurarMapa_(resultado, preservados);
  return normalizarEspacos_(resultado);
}

function formatarMilharTecnico_(numero) {
  const valor = String(numero).replace(/\./g,'');
  return valor.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}

// ============================================================
// PASSO 05 — DIMENSÕES / MULTIPLICADORES X
// ============================================================
function normalizarDimensoesMultiplicadores_(texto) {
  let resultado = String(texto);
  const unidades = ['KM','MT','CM','MM','M','KG','G','ML','LT','L','UN','PC','FL'];

  const regexX = new RegExp(
    '(\\d+(?:[.,]\\d+)?(?:\\s*(?:' + unidades.map(escaparRegex_).join('|') + '))?)\\s*X\\s*(?=\\d)',
    'g'
  );

  resultado = resultado.replace(regexX, '$1 X ');
  resultado = resultado.replace(/(\d+(?:[.,]\d+)?)\s+X\s+(?=\d)/g, '$1 X ');
  resultado = normalizarUnidadesQuantidades_(resultado);
  resultado = normalizarEspecificacoesTecnicas_(resultado);

  return normalizarEspacos_(resultado);
}

// ============================================================
// PASSO 06 — EMBALAGEM LOGÍSTICA
// ============================================================
function normalizarEmbalagemLogistica_(texto) {
  let resultado = String(texto);
  const siglas = ['CX','FD','MC'];
  const blocoSiglas = siglas.map(escaparRegex_).join('|');
  const unidades = ['KG','G','ML','LT','KM','MT','CM','MM','UN','PC','FL','CX'];
  const blocoUnidades = unidades.map(escaparRegex_).join('|');

  const r1 = new RegExp(
    '(\\d+(?:[.,]\\d+)?\\s+(?:' + blocoUnidades + '))\\s+(' + blocoSiglas + ')\\s+(?=(?:C\\/\\s*)?\\d)',
    'g'
  );
  resultado = resultado.replace(r1, '$1 - $2 ');

  const r2 = new RegExp(
    '(\\d+(?:[.,]\\d+)?\\s+X\\s+\\d+(?:[.,]\\d+)?(?:\\s+(?:CM|MM|MT))?)\\s+(' + blocoSiglas + ')\\s+(?=\\d)',
    'g'
  );
  resultado = resultado.replace(r2, '$1 - $2 ');

  const r3 = new RegExp(
    '(\\d+(?:[.,]\\d+)?\\s+(?:' + blocoUnidades + '))\\s+(' + blocoSiglas + ')\\s+C\\/\\s*(?=\\d)',
    'g'
  );
  resultado = resultado.replace(r3, '$1 - $2 C/ ');

  const r4 = new RegExp('(^|\\s)(' + blocoSiglas + ')\\s+C\\/\\s*(?=\\d)','g');
  resultado = resultado.replace(r4, function(match, prefixo, sigla) {
    return ' - ' + sigla + ' C/ ';
  });

  resultado = resultado.replace(/\s+-\s+-\s+/g, ' - ');
  resultado = resultado.replace(/\s*-\s*(?=(?:CX|FD|MC)\b)/g, ' - ');

  return normalizarEspacos_(resultado);
}

// ============================================================
// PASSO 07 — C/ S/ P/
// ============================================================
function normalizarAbreviacoesBarra_(texto) {
  return normalizarEspacos_(
    String(texto)
      .replace(/\bC\/\s*/g,'C/ ')
      .replace(/\bS\/\s*/g,'S/ ')
      .replace(/\bP\/\s*/g,'P/ ')
  );
}

// ============================================================
// PASSO 08A — TAMANHOS NUMÉRICOS
// ============================================================
function normalizarTamanhosNumericosUniformeEPI_(texto) {
  let resultado = String(texto);
  if (!ehContextoUniformeEPI_(resultado)) return resultado;

  resultado = resultado.replace(/\bTAM\.?\s*(?:N\s*[º°.]?\s*)?(\d{1,3})\b/g, 'N.$1');
  resultado = resultado.replace(/\bN\s*[º°.]?\s*(\d{1,3})\b/g, 'N.$1');
  resultado = resultado.replace(
    /\bTAM\.?\s+(PP|P|M|G|GG|XG|XGG|EXG|EXGG|XXG|EXXG|EG|EGG|G1|G2|G3|G4|G5)\b/g,
    '$1'
  );
  resultado = resultado.replace(/\bTAM\.?\s+UNICO\b/g,'UNICO');

  return normalizarEspacos_(resultado);
}

// ============================================================
// PASSO 08B — PONTUAÇÃO
// ============================================================
function normalizarPontuacao_(texto) {
  let resultado = String(texto);
  resultado = resultado.replace(/\s+,/g,',').replace(/\s+;/g,';').replace(/\s+:/g,':').replace(/\s+\./g,'.');
  resultado = resultado.replace(/,([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ])/g,', $1');
  resultado = resultado.replace(/;([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ])/g,'; $1');
  resultado = resultado.replace(/:([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ])/g,': $1');
  resultado = resultado.replace(/,{2,}/g,',').replace(/;{2,}/g,';').replace(/:{2,}/g,':');
  return normalizarEspacos_(resultado);
}

// ============================================================
// PASSO 08C — CARACTERES ESPECIAIS
// ============================================================
function normalizarCaracteresEspeciais_(texto) {
  let resultado = String(texto);
  resultado = resultado.replace(/\bN\s*[º°.]?\s*(\d{1,3})\b/g,'N.$1');
  resultado = resultado.replace(/[º°ª]/g,'');
  resultado = resultado.replace(/[“”„]/g,'"');
  resultado = resultado.replace(/[‘’´`]/g,"'");
  resultado = resultado.replace(/[\u0000-\u001F\u007F-\u009F]/g,' ');
  resultado = resultado.replace(/\u00A0/g,' ');
  return normalizarEspacos_(resultado);
}

// ============================================================
// PASSO 09 — CORES
// ============================================================
function normalizarPosicaoCores_(texto) {
  let resultado = String(texto).trim();
  let principal = resultado;
  let embalagem = '';

  const matchEmbalagem = resultado.match(/\s+-\s+(CX|FD|MC)\b.*$/);
  if (matchEmbalagem) {
    embalagem = matchEmbalagem[0].trim();
    principal = resultado.substring(0, matchEmbalagem.index).trim();
  }

  const identificacao = identificarCoresDescricao_(principal);
  if (identificacao.blocos.length === 0) return resultado;
  if (identificacao.familias.size > 1) return resultado;
  if (identificacao.blocos.length !== 1) return resultado;
  if (possuiExpressaoCorProtegida_(principal)) return resultado;
  if (ehContextoCorComoNomeProduto_(principal)) return resultado;

  const blocoCor = identificacao.blocos[0];
  const cor = blocoCor.texto;
  let base = removerBlocoCor_(principal, blocoCor);
  base = normalizarEspacos_(base);

  if (ehContextoUniformeEPI_(principal)) {
    principal = posicionarCorUniformeEPI_(base, cor);
  } else {
    principal = normalizarEspacos_(base + ' ' + cor);
  }

  resultado = embalagem ? principal + ' ' + embalagem : principal;
  return normalizarEspacos_(resultado);
}

function possuiExpressaoCorProtegida_(descricao) {
  return ['OURO BRANCO'].some(x => String(descricao).toUpperCase().includes(x));
}

function ehContextoCorComoNomeProduto_(descricao) {
  const termos = [
    'ARROZ','FEIJAO','CHA','CHOCOLATE','VINHO','CAFE','ACUCAR','FARINHA','FUBA',
    'PIMENTA','UVA','CARVAO','GRAFITE'
  ];
  const texto = String(descricao).toUpperCase();
  return termos.some(t => texto.includes(t));
}

function identificarCoresDescricao_(texto) {
  const descricao = String(texto).toUpperCase();
  const blocos = [];
  const familias = new Set();
  let mascara = descricao;

  FASE1_CORES_COMPOSTAS.forEach(corComposta => {
    const regex = new RegExp(
      '(^|\\s)' + escaparRegex_(corComposta) + '(?=$|\\s|[,;:.()\\-])',
      'g'
    );
    let match;
    while ((match = regex.exec(mascara)) !== null) {
      const prefixo = match[1] || '';
      const inicio = match.index + prefixo.length;
      const fim = inicio + corComposta.length;
      blocos.push({ texto: descricao.substring(inicio,fim), inicio, fim, familia: corComposta });
      familias.add(corComposta);
      mascara = mascara.substring(0,inicio) + ' '.repeat(corComposta.length) + mascara.substring(fim);
      regex.lastIndex = fim;
    }
  });

  FASE1_CORES_SIMPLES.forEach(item => {
    const regex = new RegExp(
      '(^|\\s)' + escaparRegex_(item.cor) + '(?=$|\\s|[,;:.()\\-])',
      'g'
    );
    let match;
    while ((match = regex.exec(mascara)) !== null) {
      const prefixo = match[1] || '';
      const inicio = match.index + prefixo.length;
      const fim = inicio + item.cor.length;
      blocos.push({ texto: descricao.substring(inicio,fim), inicio, fim, familia: item.familia });
      familias.add(item.familia);
    }
  });

  blocos.sort((a,b)=>a.inicio-b.inicio);
  return { blocos, familias };
}

function removerBlocoCor_(texto, bloco) {
  const antes = String(texto).substring(0, bloco.inicio);
  const depois = String(texto).substring(bloco.fim);
  return normalizarEspacos_(antes + ' ' + depois);
}

function posicionarCorUniformeEPI_(texto, cor) {
  const base = String(texto).trim();
  const matchNumerico = base.match(/\bN\.\d{1,3}\b/);
  if (matchNumerico) return inserirCorAntesDoTamanho_(base, cor, matchNumerico);

  const lista = [
    'EXXG','EXGG','XXG','XGG','EXG','EGG','GG','G1','G2','G3','G4','G5',
    'EG','PP','XG','P','M','G','UNICO'
  ];
  const candidatos = [];

  lista.forEach(tamanho => {
    const regex = new RegExp('\\b' + escaparRegex_(tamanho) + '\\b','g');
    let match;
    while ((match = regex.exec(base)) !== null) {
      if (['P','M','G'].includes(tamanho)) {
        const antes = base.substring(0, match.index).trimEnd();
        if (/\d(?:[.,]\d+)?\s*$/.test(antes)) continue;
      }
      candidatos.push({ texto: match[0], index: match.index });
    }
  });

  if (candidatos.length === 0) return normalizarEspacos_(base + ' ' + cor);
  candidatos.sort((a,b)=>b.index-a.index);
  return inserirCorAntesDoTamanho_(base, cor, candidatos[0]);
}

function inserirCorAntesDoTamanho_(base, cor, matchTamanho) {
  const inicio = matchTamanho.index;
  const tamanho = matchTamanho.texto || matchTamanho[0];
  const antes = base.substring(0,inicio).trim();
  const depois = base.substring(inicio + tamanho.length).trim();
  let resultado = normalizarEspacos_(antes + ' ' + cor + ' ' + tamanho);
  if (depois) resultado = normalizarEspacos_(resultado + ' ' + depois);
  return resultado;
}

// ============================================================
// PASSO 10 — MARCAS / LINHAS / IDENTIFICAÇÕES
// ============================================================
function reposicionarMarcas_(texto) {
  let resultado = normalizarEspacos_(texto);
  let principal = resultado;
  let embalagem = '';

  const matchEmbalagem = resultado.match(/\s+-\s+(CX|FD|MC)\b.*$/);
  if (matchEmbalagem) {
    embalagem = matchEmbalagem[0].trim();
    principal = resultado.substring(0, matchEmbalagem.index).trim();
  }

  const encontrados = localizarTermosMarca_(principal);
  if (encontrados.length === 0) return resultado;

  const termosDistintos = [...new Set(encontrados.map(x=>x.termo))];
  if (termosDistintos.length > 1) return resultado;

  const termo = termosDistintos[0];
  const item = FASE1_MARCAS.find(x=>x.termo === termo);
  if (!item) return resultado;

  const permitidos = ['MARCA','LINHA_COMERCIAL','IDENTIFICACAO_INTERNA','MARCADOR_LEGADO'];
  if (!permitidos.includes(item.tipo)) return resultado;

  principal = removerTodasOcorrenciasMarca_(principal, termo);
  principal = principal.replace(/\(\s*\)/g,' ');
  principal = normalizarEspacos_(principal);
  principal = normalizarEspacos_(principal + ' ' + termo);

  resultado = embalagem ? principal + ' ' + embalagem : principal;
  return normalizarEspacos_(resultado);
}

function localizarTermosMarca_(texto) {
  const encontrados = [];
  let mascara = String(texto).toUpperCase();

  FASE1_MARCAS.forEach(item => {
    const regex = new RegExp(
      '(^|[^A-Z0-9])(' + escaparRegex_(item.termo) + ')(?=$|[^A-Z0-9])',
      'g'
    );
    let match;
    while ((match = regex.exec(mascara)) !== null) {
      const prefixo = match[1] || '';
      const inicio = match.index + prefixo.length;
      const fim = inicio + item.termo.length;
      encontrados.push({ termo:item.termo, tipo:item.tipo, inicio, fim });
      mascara = mascara.substring(0,inicio) + ' '.repeat(item.termo.length) + mascara.substring(fim);
      regex.lastIndex = fim;
    }
  });

  return encontrados;
}

function removerTodasOcorrenciasMarca_(texto, termo) {
  let resultado = String(texto);
  const regex = new RegExp(
    '(^|[^A-Z0-9])(' + escaparRegex_(termo) + ')(?=$|[^A-Z0-9])',
    'g'
  );
  resultado = resultado.replace(regex, function(match, prefixo) { return prefixo; });
  resultado = resultado.replace(/\(\s*\)/g,' ');
  return normalizarEspacos_(resultado);
}

// ============================================================
// PASSO 11 — NORMALIZAÇÃO ESTRUTURAL SEGURA
// ============================================================
function normalizarEstruturaSegura_(texto) {
  let resultado = String(texto).trim();

  const abre = contarCaracter_(resultado,'(');
  const fecha = contarCaracter_(resultado,')');
  if (abre !== fecha) return resultado;

  resultado = resultado.replace(/\(\s+/g,'(');
  resultado = resultado.replace(/\s+\)/g,')');
  resultado = resultado.replace(/\(\s*\)/g,' ');
  resultado = resultado.replace(/\s+\(/g,' (');
  resultado = resultado.replace(/\)(?=[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ0-9])/g,') ');
  resultado = normalizarComplementosConhecidos_(resultado);
  resultado = resultado.replace(/\s*,\s*\(/g,' (');
  resultado = resultado.replace(/\s*;\s*\(/g,' (');

  return normalizarEspacos_(resultado);
}

function normalizarComplementosConhecidos_(texto) {
  let r = String(texto);
  r = r.replace(/\(\s*SEM\s+LOGO\s*\)/g,'(SEM LOGO)');
  r = r.replace(/\(\s*COM\s+LOGO\s*\)/g,'(COM LOGO)');
  r = r.replace(/\(\s*TIPO\s+COLEGIAL\s*\)/g,'(TIPO COLEGIAL)');
  r = r.replace(/\(\s*LOGO\s+COSTA\s+OESTE\s*\)/g,'(LOGO COSTA OESTE)');
  r = r.replace(/\(\s*LOGO\s+BORDADO\s+COSTA\s+OESTE\s*\)/g,'(LOGO BORDADO COSTA OESTE)');
  r = r.replace(/\(\s*LOGO\s+GRABIN\s*\)/g,'(LOGO GRABIN)');
  r = r.replace(/\(\s*LOGO\s+GRAGIN\s*\)/g,'(LOGO GRAGIN)');
  r = r.replace(/\(\s*COSTA\s+OESTE\s*\)/g,'(COSTA OESTE)');
  r = r.replace(/\(\s*GRABIN\s*\)/g,'(GRABIN)');
  r = r.replace(/\(\s*GRAGIN\s*\)/g,'(GRAGIN)');
  r = r.replace(/\(\s*FACILITIES\s*\)/g,'(FACILITIES)');
  r = r.replace(/\(\s*FACILITEIS\s*\)/g,'(FACILITEIS)');
  r = r.replace(/\(\s*FILIAL\s*\)/g,'(FILIAL)');
  return r;
}


// ============================================================
// PASSO 12 — NORMALIZAÇÃO SEMÂNTICA SEGURA v1.2
// ============================================================
/**
 * Reorganiza somente informações já existentes na descrição.
 * Não acrescenta material, unidade, concentração, quantidade,
 * embalagem ou qualquer atributo que não esteja no texto original.
 */
function normalizarSemanticaSeguraFase1_(texto) {
  let r = normalizarEspacos_(texto);

  // ARMARIO ACO / ARQUIVO ACO -> DE ACO
  r = r.replace(/\b(ARMARIO|ARQUIVO)\s+ACO\b/g, '$1 DE ACO');

  // COLA 100 G BRANCA -> COLA BRANCA 100 G
  // Aplicação restrita a BRANCA, pois a cor já existe no cadastro.
  r = r.replace(
    /\bCOLA\s+(\d+(?:[.,]\d+)?\s+(?:G|KG|ML|LT))\s+BRANCA\b/g,
    'COLA BRANCA $1'
  );

  // CONCENTRADO <PRODUTO> -> <PRODUTO> CONCENTRADO
  // Somente famílias verificadas na revisão manual.
  r = r.replace(
    /\bCONCENTRADO\s+(?:DE\s+)?AGUA\s+SANITARIA\b/g,
    'AGUA SANITARIA CONCENTRADO'
  );
  r = r.replace(
    /\bCONCENTRADO\s+DESINFETANTE\b/g,
    'DESINFETANTE CONCENTRADO'
  );
  r = r.replace(
    /\bCONCENTRADO\s+DETERGENTE\s+NEUTRO\b/g,
    'DETERGENTE NEUTRO CONCENTRADO'
  );
  r = r.replace(
    /\bCONCENTRADO\s+MULTIUSO\b/g,
    'MULTIUSO CONCENTRADO'
  );

  // CORRENTE PARA MOTOSSERRA -> CORRENTE MOTOSSERRA
  r = r.replace(
    /\bCORRENTE\s+PARA\s+MOTOSSERRA\b/g,
    'CORRENTE MOTOSSERRA'
  );

  // BALDE PLASTICO - 15 LT / BALDE PLASTICO DE 5 LT
  // Apenas remove conectivos/separadores redundantes.
  r = r.replace(
    /\bBALDE\s+PLASTICO\s+-\s+(?=\d)/g,
    'BALDE PLASTICO '
  );
  r = r.replace(
    /\bBALDE\s+PLASTICO\s+DE\s+(?=\d)/g,
    'BALDE PLASTICO '
  );

  return normalizarEspacos_(r);
}


function contarCaracter_(texto, caractere) {
  return String(texto).split(caractere).length - 1;
}
