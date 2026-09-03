// FASE 2 — SCRIPT MESTRE v1.5 — QUALIDADE + SIMILARES SEMÂNTICOS
// Base homologada: 2A.1 + 2A.2 v8 + 2B.1 v3 + 2C.1 v1.1
// v1.5: cobertura informacional + bloqueios semânticos/números + remoção de conflitos de H
// Entrada: Cadastros!A:B | Saída: Cadastros!C:H + abas de diagnóstico, proposta e mapa
// Função principal: executarFase2()

const FASE2 = {
  ABA_CADASTROS: 'Cadastros',
  ABA_DUP_EXATAS: 'Diagnostico_Duplicidades_Exatas',
  ABA_QUASE_DUP: 'Diagnostico_Quase_Duplicidades',
  ABA_PROPOSTA: 'Proposta_Cadastro_Mestre',
  ABA_QUALIDADE: 'Diagnostico_Qualidade_Cadastros',
  LINHA_INICIAL: 2,
  SCORE_MINIMO: 0.72,
  SCORE_BASE_MINIMO_CONFLITO: 0.72,
  TAMANHO_BLOCO: 80
};

const PREFIXOS_MODELO_F2 = ['CL','FS','SR','HD','XP','PFF'];
const MARCAS_F2 = ['STIHL','BIC','DELL','SAMSUNG','INTELBRAS','INTEL','KINGSTON','LOGITECH','SPARTAN','KARCHER','JACTO','EKKOA','MARINE FRESH','SOLV FRESH','CLEAN GLASS','WHITE CLEAN','CLEAN BY PEROXI','YELLOW PINE','POWER PINE','BOWL CLEANSE'];
const CORES_F2 = ['AZUL MARINHO','AZUL CLARO','AZUL ROYAL','CINZA CHUMBO','CINZA MESCLADO','CINZA CLARO','VERDE BANDEIRA','VERDE OLIVA','BRANCO LEITOSO','AMARELO','AMARELA','AZUL','BEGE','BRANCO','BRANCA','CINZA','LARANJA','MARROM','PRETO','PRETA','ROSA','VERDE','VERMELHO','VERMELHA','TRANSPARENTE','INCOLOR'];

function executarFase2() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cad = ss.getSheetByName(FASE2.ABA_CADASTROS);
  if (!cad) throw new Error('A aba "Cadastros" não foi encontrada.');
  validarEntradaFase2_(cad);

  const r1 = diagnosticarDuplicidadesExatasF2_(ss, cad);
  const r2 = diagnosticarQuaseDuplicidadesF2_(ss, cad);
  const r3 = gerarPropostaCadastroMestreF2_(ss, cad);
  const r4 = gerarDeParaCodigoMestre2C1(true);
  const r5 = analisarQualidadeESimilaresF2_(ss, cad);

  SpreadsheetApp.getUi().alert(
    'FASE 2 concluída.\n\n' +
    'Duplicidades exatas: ' + r1.grupos + ' grupos / ' + r1.cadastros + ' cadastros\n' +
    'Quase duplicidades: ' + r2.total + ' pares\n' +
    '  Alta: ' + r2.alta + '\n' +
    '  Média: ' + r2.media + '\n' +
    '  Baixa: ' + r2.baixa + '\n' +
    '  Conflitos: ' + r2.conflito + '\n' +
    '  Estrutura incompleta: ' + r2.incompleta + '\n\n' +
    'Governança: ' + r3.grupos + ' grupos\n' +
    '  Mestres provisórios: ' + r3.mestres + '\n' +
    '  Candidatos à inativação: ' + r3.inativacao + '\n' +
    '  Revisar equivalência: ' + r3.revisar + '\n\n' +
    '2C.1 — Código Mestre + DE/PARA\n' +
    '  Cadastros processados: ' + r4.processados + '\n' +
    '  Cadastros únicos: ' + r4.unicos + '\n' +
    '  Mestres provisórios: ' + r4.mestres + '\n' +
    '  DE/PARA exato: ' + r4.deParaExato + '\n' +
    '  Revisar equivalência: ' + r4.revisar + '\n' +
    '  Novos códigos: ' + r4.novosCodigos + '\n' +
    '  Códigos reutilizados: ' + r4.reutilizados + '\n\n' +
    'Qualidade cadastral\n' +
    '  Descrições insuficientes: ' + r5.insuficientes + '\n' +
    '  Linhas com sugestões: ' + r5.comSugestoes + '\n\n' +
    'As colunas A e B não foram alteradas.'
  );
}

function validarEntradaFase2_(aba) {
  const ultima = aba.getLastRow();
  if (ultima < 2) throw new Error('A aba "Cadastros" não possui registros.');
  const dados = aba.getRange(2,1,ultima-1,2).getDisplayValues();
  if (!dados.some(r => String(r[0]||'').trim())) throw new Error('A coluna A não possui descrições originais.');
  if (!dados.some(r => String(r[1]||'').trim())) throw new Error('A coluna B não possui a base saneada. Execute primeiro a Fase 1.');
}

// ============================================================
// 2A.1 — DUPLICIDADES EXATAS
// ============================================================

function diagnosticarDuplicidadesExatasF2_(ss, aba) {
  const ultima = aba.getLastRow();
  const dados = aba.getRange(2,1,ultima-1,2).getDisplayValues();
  const mapa = new Map();

  dados.forEach((r,i) => {
    const original = String(r[0]||'').trim();
    const saneada = String(r[1]||'').trim();
    if (!saneada) return;
    const linha = i + 2;
    if (!mapa.has(saneada)) mapa.set(saneada,{saneada,linhas:[],originais:[]});
    const g = mapa.get(saneada);
    g.linhas.push(linha);
    g.originais.push(original);
  });

  const grupos = [...mapa.values()]
    .filter(g => g.linhas.length > 1)
    .sort((a,b) => b.linhas.length-a.linhas.length || a.saneada.localeCompare(b.saneada));

  const out = [[
    'GRUPO_DUPLICIDADE','DESCRICAO_SANEADA','QTDE_CADASTROS','LINHAS_CADASTROS',
    'DESCRICOES_ORIGINAIS','QTDE_ORIGINAIS_DISTINTAS','CLASSIFICACAO',
    'ACAO_SUGERIDA','VALIDAR','OBSERVACAO'
  ]];

  grupos.forEach((g,i) => {
    const orig = [...new Set(g.originais.filter(Boolean))];
    out.push([
      'DUP-EX-' + String(i+1).padStart(4,'0'),
      g.saneada,
      g.linhas.length,
      g.linhas.join(', '),
      orig.join(' | '),
      orig.length,
      'DUPLICIDADE_EXATA',
      'REVISAR PARA DEFINIR CADASTRO MESTRE',
      '',
      ''
    ]);
  });

  const dest = obterOuLimparAbaF2_(ss, FASE2.ABA_DUP_EXATAS);
  dest.getRange(1,1,out.length,out[0].length).setValues(out);
  formatarGenericoF2_(dest,out.length,out[0].length);

  return {
    grupos: grupos.length,
    cadastros: grupos.reduce((s,g)=>s+g.linhas.length,0)
  };
}

// ============================================================
// 2A.2 — QUASE DUPLICIDADES v8
// ============================================================

function diagnosticarQuaseDuplicidadesF2_(ss, aba) {
  const ultima = aba.getLastRow();
  const dados = aba.getRange(2,1,ultima-1,2).getDisplayValues();
  const registros = [];

  dados.forEach((r,i)=>{
    const original = String(r[0]||'').trim();
    const saneada = String(r[1]||'').trim();
    if (saneada) registros.push(prepararRegistroF2_(i+2,original,saneada));
  });

  const blocos = construirBlocosF2_(registros);
  const pares = new Set();
  const candidatos = [];

  blocos.forEach(bloco=>{
    for (let i=0;i<bloco.length;i++) {
      for (let j=i+1;j<bloco.length;j++) {
        const a=bloco[i], b=bloco[j];
        const chave = a.linha < b.linha ? a.linha+'|'+b.linha : b.linha+'|'+a.linha;
        if (pares.has(chave)) continue;
        pares.add(chave);
        if (a.saneada === b.saneada) continue;

        const c = compararRegistrosF2_(a,b);
        if (conflitoSomenteTamanhoF2_(c)) continue;

        if (c.classificacao === 'CONFLITO_ATRIBUTO_CRITICO' || c.classificacao === 'ESTRUTURA_INCOMPLETA') {
          if (c.scoreBase < FASE2.SCORE_BASE_MINIMO_CONFLITO) continue;
        } else {
          if (c.scoreFinal < FASE2.SCORE_MINIMO) continue;
        }
        candidatos.push(c);
      }
    }
  });

  const ordem = {
    CANDIDATO_ALTA_CONFIANCA:1,
    CANDIDATO_MEDIA_CONFIANCA:2,
    CANDIDATO_BAIXA_CONFIANCA:3,
    CONFLITO_ATRIBUTO_CRITICO:4,
    ESTRUTURA_INCOMPLETA:5
  };

  candidatos.sort((a,b)=>
    (ordem[a.classificacao]||99)-(ordem[b.classificacao]||99) ||
    b.scoreBase-a.scoreBase ||
    b.scoreFinal-a.scoreFinal ||
    a.a.saneada.localeCompare(b.a.saneada)
  );

  const out = [[
    'CANDIDATO','LINHA_A','DESCRICAO_ORIGINAL_A','DESCRICAO_SANEADA_A',
    'LINHA_B','DESCRICAO_ORIGINAL_B','DESCRICAO_SANEADA_B',
    'SIMILARIDADE_TEXTO','SIMILARIDADE_TOKENS','SCORE_BASE','SCORE_FINAL',
    'TAMANHO_A','TAMANHO_B','MEDIDAS_A','MEDIDAS_B','DIMENSOES_A','DIMENSOES_B',
    'QUANTIDADE_APRESENTACAO_A','QUANTIDADE_APRESENTACAO_B','CORES_A','CORES_B',
    'MANGA_A','MANGA_B','GENERO_MODELO_A','GENERO_MODELO_B',
    'ATRIBUTOS_FUNCIONAIS_A','ATRIBUTOS_FUNCIONAIS_B',
    'ATRIBUTOS_ESTRUTURAIS_A','ATRIBUTOS_ESTRUTURAIS_B',
    'MODELOS_REFERENCIAS_A','MODELOS_REFERENCIAS_B',
    'ESPECIFICACOES_A','ESPECIFICACOES_B','MARCAS_A','MARCAS_B',
    'IDENTIFICACOES_A','IDENTIFICACOES_B','ESTRUTURA_A','ESTRUTURA_B',
    'DIFERENCAS_IDENTIFICADAS','CLASSIFICACAO','ACAO_SUGERIDA','VALIDAR','OBSERVACAO'
  ]];

  candidatos.forEach((x,i)=>{
    out.push([
      'QD-' + String(i+1).padStart(5,'0'),
      x.a.linha,x.a.original,x.a.saneada,
      x.b.linha,x.b.original,x.b.saneada,
      pctF2_(x.simTexto),pctF2_(x.simTokens),pctF2_(x.scoreBase),pctF2_(x.scoreFinal),
      x.a.tamanhos.join(' | '),x.b.tamanhos.join(' | '),
      x.a.medidas.join(' | '),x.b.medidas.join(' | '),
      x.a.dimensoes.join(' | '),x.b.dimensoes.join(' | '),
      x.a.quantidadesApresentacao.join(' | '),x.b.quantidadesApresentacao.join(' | '),
      x.a.cores.join(' | '),x.b.cores.join(' | '),
      x.a.mangas.join(' | '),x.b.mangas.join(' | '),
      x.a.generoModelo.join(' | '),x.b.generoModelo.join(' | '),
      x.a.atributosCriticos.join(' | '),x.b.atributosCriticos.join(' | '),
      x.a.atributosEstruturais.join(' | '),x.b.atributosEstruturais.join(' | '),
      x.a.modelosReferencias.join(' | '),x.b.modelosReferencias.join(' | '),
      x.a.especificacoes.join(' | '),x.b.especificacoes.join(' | '),
      x.a.marcas.join(' | '),x.b.marcas.join(' | '),
      x.a.identificacoesInternas.join(' | '),x.b.identificacoesInternas.join(' | '),
      x.a.estruturaIncompleta?'INCOMPLETA':'OK',
      x.b.estruturaIncompleta?'INCOMPLETA':'OK',
      x.diferencas.join(' | '),x.classificacao,x.acao,'',''
    ]);
  });

  const dest = obterOuLimparAbaF2_(ss, FASE2.ABA_QUASE_DUP);
  dest.getRange(1,1,out.length,out[0].length).setValues(out);
  formatarGenericoF2_(dest,out.length,out[0].length);

  return {
    total:candidatos.length,
    alta:candidatos.filter(x=>x.classificacao==='CANDIDATO_ALTA_CONFIANCA').length,
    media:candidatos.filter(x=>x.classificacao==='CANDIDATO_MEDIA_CONFIANCA').length,
    baixa:candidatos.filter(x=>x.classificacao==='CANDIDATO_BAIXA_CONFIANCA').length,
    conflito:candidatos.filter(x=>x.classificacao==='CONFLITO_ATRIBUTO_CRITICO').length,
    incompleta:candidatos.filter(x=>x.classificacao==='ESTRUTURA_INCOMPLETA').length
  };
}

function prepararRegistroF2_(linha,original,saneada) {
  const semEmb = removerEmbalagemF2_(saneada);
  const semId = removerIdentificacoesF2_(semEmb);
  return {
    linha,original,saneada,
    textoMatching: normalizarMatchingF2_(semId),
    tamanhos: extrairTamanhosF2_(saneada),
    medidas: extrairMedidasF2_(saneada),
    dimensoes: extrairDimensoesF2_(saneada),
    quantidadesApresentacao: extrairQuantidadeApresentacaoF2_(saneada),
    cores: extrairCoresF2_(saneada),
    mangas: extrairMangasF2_(saneada),
    generoModelo: extrairGeneroF2_(saneada),
    atributosCriticos: extrairAtributosFuncionaisF2_(saneada),
    atributosEstruturais: extrairAtributosEstruturaisF2_(saneada),
    modelosReferencias: extrairModelosF2_(saneada),
    especificacoes: extrairEspecificacoesF2_(saneada),
    marcas: MARCAS_F2.filter(m=>contemTermoF2_(saneada,m)),
    identificacoesInternas: extrairIdentificacoesF2_(saneada),
    embalagemLogistica: extrairEmbalagemF2_(saneada),
    estruturaIncompleta: parentesesIncompletosF2_(saneada)
  };
}

function construirBlocosF2_(registros) {
  const mapa = new Map();
  registros.forEach(r=>{
    const t = tokensF2_(r.textoMatching);
    if (!t.length) return;
    const chave = t.length>=2 ? t[0]+'|'+t[1] : t[0];
    if (!mapa.has(chave)) mapa.set(chave,[]);
    mapa.get(chave).push(r);
  });

  const blocos=[];
  [...mapa.values()].forEach(bloco=>{
    if (bloco.length<2) return;
    if (bloco.length<=FASE2.TAMANHO_BLOCO) {
      blocos.push(bloco);
      return;
    }
    const sub=new Map();
    bloco.forEach(r=>{
      const t=tokensF2_(r.textoMatching);
      const chave=(t[0]||'')+'|'+(t[1]||'')+'|'+(t[2]||'__SEM_TERCEIRO__');
      if (!sub.has(chave)) sub.set(chave,[]);
      sub.get(chave).push(r);
    });
    [...sub.values()].forEach(x=>{if(x.length>1)blocos.push(x);});
  });
  return blocos;
}

function compararRegistrosF2_(a,b) {
  const simTexto = similaridadeTextoF2_(a.textoMatching,b.textoMatching);
  const simTokens = similaridadeTokensF2_(a.textoMatching,b.textoMatching);
  const scoreBase = simTokens*0.55 + simTexto*0.45;
  let score = scoreBase;
  const diferencas=[];
  let conflito=false;
  const incompleta=a.estruturaIncompleta||b.estruturaIncompleta;

  if(incompleta) diferencas.push('ESTRUTURA_INCOMPLETA');

  const criticos = [
    ['TAMANHO_DIFERENTE',a.tamanhos,b.tamanhos,0.30],
    ['MANGA_DIFERENTE',a.mangas,b.mangas,0.30],
    ['GENERO_MODELAGEM_DIFERENTE',a.generoModelo,b.generoModelo,0.30],
    ['ATRIBUTO_FUNCIONAL_DIFERENTE',a.atributosCriticos,b.atributosCriticos,0.35],
    ['ATRIBUTO_ESTRUTURAL_DIFERENTE',a.atributosEstruturais,b.atributosEstruturais,0.30],
    ['MODELO_REFERENCIA_DIFERENTE',a.modelosReferencias,b.modelosReferencias,0.35],
    ['DIMENSAO_DIFERENTE',a.dimensoes,b.dimensoes,0.30],
    ['QUANTIDADE_APRESENTACAO_DIFERENTE',a.quantidadesApresentacao,b.quantidadesApresentacao,0.30],
    ['ESPECIFICACAO_TECNICA_DIFERENTE',a.especificacoes,b.especificacoes,0.30]
  ];

  criticos.forEach(([nome,x,y,pen])=>{
    if(atributosDiferentesF2_(x,y,true)){
      diferencas.push(nome);
      score-=pen;
      conflito=true;
    }
  });

  if(atributosDiferentesF2_(a.medidas,b.medidas,true)){
    diferencas.push('MEDIDA_QUANTIDADE_DIFERENTE'); score-=0.20;
  }
  if(atributosDiferentesF2_(a.cores,b.cores,true)){
    diferencas.push('COR_DIFERENTE'); score-=0.15;
  }
  if(atributosDiferentesF2_(a.marcas,b.marcas,true)){
    diferencas.push('MARCA_DIFERENTE'); score-=0.15;
  }
  if(atributosDiferentesF2_(a.identificacoesInternas,b.identificacoesInternas,true)){
    diferencas.push('IDENTIFICACAO_INTERNA_DIFERENTE');
  }
  if(a.embalagemLogistica!==b.embalagemLogistica && (a.embalagemLogistica||b.embalagemLogistica)){
    diferencas.push('EMBALAGEM_LOGISTICA_DIFERENTE'); score-=0.03;
  }

  score=Math.max(0,Math.min(1,score));

  let classificacao,acao;
  if(incompleta){
    classificacao='ESTRUTURA_INCOMPLETA';
    acao='REVISAR ESTRUTURA ANTES DE CONSOLIDAR';
  } else if(conflito){
    classificacao='CONFLITO_ATRIBUTO_CRITICO';
    acao='NAO CONSOLIDAR AUTOMATICAMENTE';
  } else if(score>=0.93 && diferencas.filter(x=>!['IDENTIFICACAO_INTERNA_DIFERENTE','EMBALAGEM_LOGISTICA_DIFERENTE'].includes(x)).length===0){
    classificacao='CANDIDATO_ALTA_CONFIANCA';
    acao='REVISAR COMO PROVAVEL DUPLICIDADE';
  } else if(score>=0.84){
    classificacao='CANDIDATO_MEDIA_CONFIANCA';
    acao='REVISAR EVIDENCIAS';
  } else {
    classificacao='CANDIDATO_BAIXA_CONFIANCA';
    acao='REVISAR MANUALMENTE';
  }

  return {a,b,simTexto,simTokens,scoreBase,scoreFinal:score,diferencas,classificacao,acao};
}

function conflitoSomenteTamanhoF2_(c){
  if(c.classificacao!=='CONFLITO_ATRIBUTO_CRITICO') return false;
  const criticas=c.diferencas.filter(x=>[
    'TAMANHO_DIFERENTE','MANGA_DIFERENTE','GENERO_MODELAGEM_DIFERENTE',
    'ATRIBUTO_FUNCIONAL_DIFERENTE','ATRIBUTO_ESTRUTURAL_DIFERENTE',
    'MODELO_REFERENCIA_DIFERENTE','DIMENSAO_DIFERENTE',
    'QUANTIDADE_APRESENTACAO_DIFERENTE','ESPECIFICACAO_TECNICA_DIFERENTE'
  ].includes(x));
  return criticas.length===1 && criticas[0]==='TAMANHO_DIFERENTE';
}

// ============================================================
// EXTRATORES 2A.2
// ============================================================

function extrairTamanhosF2_(texto){
  const out=[];
  const re=/\b(N\.\d{1,3}|EXXG|EXGG|XXG|XGG|EXG|EGG|GG|G[1-5]|EG|PP|XG|P|M|G|UNICO)\b/g;
  let m;
  while((m=re.exec(texto))!==null){
    const v=m[1];
    if(['G','M','P'].includes(v)){
      const antes=texto.substring(0,m.index).trimEnd();
      if(/\d(?:[.,]\d+)?\s*$/.test(antes)) continue;
    }
    out.push(v);
  }
  return unicosF2_(out);
}

function extrairMedidasF2_(texto){
  return unicosF2_(String(texto).match(/\b\d+(?:[.,]\d+)?\s+(?:KG|G|ML|LT|KM|MT|CM|MM|UN|PC|FL|CX)\b/g)||[]);
}

function extrairDimensoesF2_(texto){
  const out=[];
  [
    /\b\d+(?:[.,]\d+)?\s+X\s+\d+(?:[.,]\d+)?\s+X\s+\d+(?:[.,]\d+)?(?:\s+(?:MM|CM|MT))?\b/g,
    /\b\d+(?:[.,]\d+)?\s+X\s+\d+(?:[.,]\d+)?(?:\s+(?:MM|CM|MT))?\b/g
  ].forEach(re=>(String(texto).match(re)||[]).forEach(x=>out.push(x)));
  return unicosF2_(out);
}

function extrairQuantidadeApresentacaoF2_(texto){
  const out=[];
  const re=/\bC\/\s*(\d+(?:[.,]\d+)?)(?:\s+(UN|PC|FL|CX))?\b/g;
  let m;
  while((m=re.exec(texto))!==null){
    out.push('C/ '+m[1]+(m[2]?' '+m[2]:''));
  }
  return unicosF2_(out);
}

function extrairMangasF2_(texto){
  const t=String(texto).toUpperCase(), out=[];
  if(/\bM\s*\/\s*C\b/.test(t)||/\bMANGA CURTA\b/.test(t)) out.push('MANGA_CURTA');
  if(/\bM\s*\/\s*L\b/.test(t)||/\bMANGA LONGA\b/.test(t)) out.push('MANGA_LONGA');
  if(/\bSEM MANGA\b/.test(t)) out.push('SEM_MANGA');
  return unicosF2_(out);
}

function extrairGeneroF2_(texto){
  const t=semAcentoF2_(String(texto).toUpperCase()), out=[];
  if(/\bFEMININ[AO]\b/.test(t)) out.push('FEMININO');
  if(/\bMASCULIN[AO]\b/.test(t)) out.push('MASCULINO');
  if(/\bUNISEX\b/.test(t)||/\bUNISSEX\b/.test(t)) out.push('UNISSEX');
  return unicosF2_(out);
}

function extrairAtributosFuncionaisF2_(texto){
  const t=semAcentoF2_(String(texto).toUpperCase()), out=[];
  [
    [/\bCOM CABO\b/,'COM_CABO'],[/\bSEM CABO\b/,'SEM_CABO'],
    [/\bCOM BOLSO\b/,'COM_BOLSO'],[/\bSEM BOLSO\b/,'SEM_BOLSO'],
    [/\bCOM SUPORTE\b/,'COM_SUPORTE'],[/\bSEM SUPORTE\b/,'SEM_SUPORTE'],
    [/\bCOM TAMPA\b/,'COM_TAMPA'],[/\bSEM TAMPA\b/,'SEM_TAMPA'],
    [/\bCOM VALVULA\b/,'COM_VALVULA'],[/\bSEM VALVULA\b/,'SEM_VALVULA'],
    [/\bCOM ELASTICO\b/,'COM_ELASTICO'],[/\bSEM ELASTICO\b/,'SEM_ELASTICO'],
    [/\bCOM CORDAO\b/,'COM_CORDAO'],[/\bSEM CORDAO\b/,'SEM_CORDAO']
  ].forEach(([re,v])=>{if(re.test(t))out.push(v);});
  return unicosF2_(out);
}

function extrairAtributosEstruturaisF2_(texto){
  const t=semAcentoF2_(String(texto).toUpperCase()), out=[];
  [
    [/\bFOLHA SIMPLES\b/,'FOLHA_SIMPLES'],[/\bFOLHA DUPLA\b/,'FOLHA_DUPLA'],
    [/\bFOLHA TRIPLA\b/,'FOLHA_TRIPLA'],[/\bDUPLA FACE\b/,'DUPLA_FACE'],
    [/\bSIMPLES\b/,'SIMPLES'],[/\bDUPLO\b/,'DUPLO'],[/\bDUPLA\b/,'DUPLA'],
    [/\bTRIPLO\b/,'TRIPLO'],[/\bTRIPLA\b/,'TRIPLA']
  ].forEach(([re,v])=>{if(re.test(t))out.push(v);});

  if(out.includes('FOLHA_DUPLA')) removerValorF2_(out,'DUPLA');
  if(out.includes('FOLHA_TRIPLA')) removerValorF2_(out,'TRIPLA');
  if(out.includes('FOLHA_SIMPLES')) removerValorF2_(out,'SIMPLES');
  if(out.includes('DUPLA_FACE')) removerValorF2_(out,'DUPLA');
  return unicosF2_(out);
}

function extrairModelosF2_(texto){
  const t=semAcentoF2_(String(texto).toUpperCase()), out=[];
  [
    /\bMODELO\s+[A-Z0-9][A-Z0-9._\-\/]*\b/g,
    /\bMOD\.?\s+[A-Z0-9][A-Z0-9._\-\/]*\b/g,
    /\bREF\.?\s+[A-Z0-9][A-Z0-9._\-\/]*\b/g,
    /\bREFERENCIA\s+[A-Z0-9][A-Z0-9._\-\/]*\b/g,
    /\bCOD\.?\s+[A-Z0-9][A-Z0-9._\-\/]*\b/g,
    /\bCODIGO\s+[A-Z0-9][A-Z0-9._\-\/]*\b/g
  ].forEach(re=>(t.match(re)||[]).forEach(x=>out.push(x.replace(/\s+/g,' ').trim())));

  PREFIXOS_MODELO_F2.forEach(p=>{
    const re=new RegExp('\b'+escF2_(p)+'\s*[-/]?\s*([A-Z0-9][A-Z0-9._\\-/]*)\b','g');
    let m;
    while((m=re.exec(t))!==null) out.push((p+' '+m[1]).replace(/\s+/g,' ').trim());
  });
  return unicosF2_(out);
}

function extrairEspecificacoesF2_(texto){
  const out=[];
  [
    /\b\d{1,2}W\d{2}\b/g,
    /\bPFF-?\d+\b/g,
    /\b\d+(?:[.,]\d+)?(?:V|KV|W|KW|A|AH|MAH|HZ|KHZ|MHZ|GHZ|RPM|BTU|BTUS|DB|DBI|AWG|MP|MS)\b/g,
    /\b\d{1,3}(?:\.\d{3})*MT\/S\b/g,
    /\bMICRA\s+\d+(?:[.,]\d+)?\b/g,
    /\bMICRAS\s+\d+(?:[.,]\d+)?\b/g,
    /\b\d+(?:[.,]\d+)?\s*%\b/g
  ].forEach(re=>(String(texto).match(re)||[]).forEach(x=>out.push(x)));
  return unicosF2_(out);
}

function extrairCoresF2_(texto){
  const out=[];
  let mascara=' '+String(texto).toUpperCase()+' ';
  [...CORES_F2].sort((a,b)=>b.length-a.length).forEach(cor=>{
    const re=new RegExp('(^|[^A-Z])'+escF2_(cor)+'(?=$|[^A-Z])');
    if(re.test(mascara)){
      out.push(cor);
      mascara=mascara.replace(cor,' '.repeat(cor.length));
    }
  });
  return out;
}

function extrairIdentificacoesF2_(texto){
  const out=[];
  if(contemTermoF2_(texto,'COSTA OESTE')) out.push('COSTA_OESTE');
  if(contemTermoF2_(texto,'GRABIN')||contemTermoF2_(texto,'GRAGIN')) out.push('GRABIN');
  if(contemTermoF2_(texto,'FACILITIES')||contemTermoF2_(texto,'FACILITEIS')) out.push('FACILITIES');
  if(contemTermoF2_(texto,'FILIAL')) out.push('FILIAL');
  return unicosF2_(out);
}

function removerIdentificacoesF2_(texto){
  let r=String(texto);
  ['COSTA OESTE','GRABIN','GRAGIN','FACILITIES','FACILITEIS','FILIAL']
    .sort((a,b)=>b.length-a.length)
    .forEach(t=>{
      r=r.replace(new RegExp('(^|[^A-Z0-9])'+escF2_(t)+'(?=$|[^A-Z0-9])','g'),'$1');
    });
  return r.replace(/\s+/g,' ').trim();
}

function extrairEmbalagemF2_(texto){
  const m=String(texto).match(/\s+-\s+(CX|FD|MC)\b.*$/);
  return m?m[0].trim():'';
}

function removerEmbalagemF2_(texto){
  return String(texto).replace(/\s+-\s+(CX|FD|MC)\b.*$/,'').trim();
}

function parentesesIncompletosF2_(texto){
  const t=String(texto);
  return (t.match(/\(/g)||[]).length !== (t.match(/\)/g)||[]).length;
}

function normalizarMatchingF2_(texto){
  return semAcentoF2_(String(texto).toUpperCase())
    .replace(/[(),;:"']/g,' ')
    .replace(/\s+-\s+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function tokensF2_(texto){
  const ignorar=new Set(['DE','DA','DO','DAS','DOS','E','PARA','POR','EM','TIPO']);
  return String(texto).split(/\s+/).map(x=>x.trim()).filter(x=>x && !ignorar.has(x));
}

function similaridadeTokensF2_(a,b){
  const A=new Set(tokensF2_(a)), B=new Set(tokensF2_(b));
  if(!A.size||!B.size) return 0;
  let inter=0; A.forEach(x=>{if(B.has(x))inter++;});
  return inter/(A.size+B.size-inter);
}

function similaridadeTextoF2_(a,b){
  a=String(a); b=String(b);
  if(a===b) return 1;
  const maior=Math.max(a.length,b.length);
  if(!maior) return 1;
  return 1-distanciaLevenshteinF2_(a,b)/maior;
}

function atributosDiferentesF2_(a,b,ausenciaConta){
  const A=new Set(a), B=new Set(b);
  if(!A.size&&!B.size) return false;
  if(ausenciaConta && (!A.size||!B.size)) return true;
  if(A.size!==B.size) return true;
  for(const x of A) if(!B.has(x)) return true;
  return false;
}

// ============================================================
// 2B.1 — CADASTRO MESTRE / GOVERNANÇA v3
// ============================================================

function gerarPropostaCadastroMestreF2_(ss, cad) {
  const exatas=ss.getSheetByName(FASE2.ABA_DUP_EXATAS);
  const quase=ss.getSheetByName(FASE2.ABA_QUASE_DUP);
  const mapa=carregarCadastrosF2_(cad);

  const ufGeral=criarUnionFindF2_();
  const ufExatas=criarUnionFindF2_();
  const relacoes=[];

  carregarRelacoesExatasF2_(exatas,ufGeral,ufExatas,relacoes);
  carregarRelacoesQuaseF2_(quase,ufGeral,relacoes);

  const grupos=montarGruposGovernancaF2_(ufGeral,relacoes,mapa);
  const nucleos=montarNucleosExatosF2_(ufExatas,mapa);
  const indice=construirIndiceNucleosF2_(nucleos);

  const out=[[
    'GRUPO_GOVERNANCA','TIPO_GRUPO','QTDE_CADASTROS','NUCLEO_EXATO','LINHA_CADASTRO',
    'DESCRICAO_ORIGINAL','DESCRICAO_SANEADA','PAPEL_SUGERIDO',
    'LINHA_MESTRE_PROVISORIA','DESCRICAO_MESTRE_PROVISORIA','CRITERIO_MESTRE',
    'POSSUI_DUPLICIDADE_EXATA','POSSUI_QUASE_DUPLICIDADE',
    'MELHOR_SCORE_BASE','MELHOR_SCORE_FINAL','EVIDENCIAS_GRUPO',
    'ACAO_PROPOSTA','VALIDAR','DECISAO_FINAL','OBSERVACAO'
  ]];

  let mestres=0,inativacao=0,revisar=0;

  grupos.forEach((g,idx)=>{
    const codigo='GOV-'+String(idx+1).padStart(4,'0');
    const tipo=g.possuiExata&&g.possuiQuase?'MISTO_EXATA_E_QUASE':g.possuiExata?'DUPLICIDADE_EXATA':'QUASE_DUPLICIDADE';
    const evidencias=montarEvidenciasGrupoF2_(g);

    const nucleosDoGrupo=new Map();
    g.cadastros.forEach(c=>{
      const id=indice.get(c.linha);
      if(id&&!nucleosDoGrupo.has(id)) nucleosDoGrupo.set(id,nucleos.get(id));
    });

    const mestresPorNucleo=new Map();
    nucleosDoGrupo.forEach((n,id)=>{
      mestresPorNucleo.set(id,escolherMestreF2_(n.cadastros));
      mestres++;
    });

    g.cadastros.sort((a,b)=>a.linha-b.linha).forEach(c=>{
      const id=indice.get(c.linha);
      let papel,acao,mestre=null;

      if(id&&mestresPorNucleo.has(id)){
        mestre=mestresPorNucleo.get(id);
        if(c.linha===mestre.linha){
          papel='MESTRE_PROVISORIO';
          acao='MANTER PROVISORIAMENTE';
        }else{
          papel='CANDIDATO_INATIVACAO';
          acao='INATIVAR APOS VALIDACAO';
          inativacao++;
        }
      }else{
        papel='REVISAR_EQUIVALENCIA';
        acao='VALIDAR EQUIVALENCIA COM O GRUPO';
        revisar++;
      }

      out.push([
        codigo,tipo,g.cadastros.length,id||'',c.linha,c.original,c.saneada,papel,
        mestre?mestre.linha:'',mestre?mestre.saneada:'',
        mestre?'MENOR DISTANCIA ENTRE ORIGINAL E SANEADA NO NUCLEO EXATO':'NAO DEFINIDO - RELACAO SOMENTE POR QUASE DUPLICIDADE',
        id?'SIM':'NAO',g.possuiQuase?'SIM':'NAO',g.melhorScoreBase,g.melhorScoreFinal,
        evidencias,acao,'','',''
      ]);
    });
  });

  const dest=obterOuLimparAbaF2_(ss,FASE2.ABA_PROPOSTA);
  dest.getRange(1,1,out.length,out[0].length).setValues(out);
  formatarGenericoF2_(dest,out.length,out[0].length);

  return {grupos:grupos.length,mestres,inativacao,revisar};
}

function carregarCadastrosF2_(aba){
  const ultima=aba.getLastRow();
  const dados=aba.getRange(2,1,ultima-1,2).getDisplayValues();
  const mapa=new Map();
  dados.forEach((r,i)=>mapa.set(i+2,{linha:i+2,original:String(r[0]||'').trim(),saneada:String(r[1]||'').trim()}));
  return mapa;
}

function criarUnionFindF2_(){
  const parent=new Map(),rank=new Map();
  function add(x){if(!parent.has(x)){parent.set(x,x);rank.set(x,0);}}
  function find(x){add(x);const p=parent.get(x);if(p!==x)parent.set(x,find(p));return parent.get(x);}
  function union(a,b){
    add(a);add(b);let ra=find(a),rb=find(b);if(ra===rb)return;
    const aa=rank.get(ra),bb=rank.get(rb);
    if(aa<bb)parent.set(ra,rb);
    else if(aa>bb)parent.set(rb,ra);
    else{parent.set(rb,ra);rank.set(ra,aa+1);}
  }
  return {add,find,union,elementos:()=>[...parent.keys()]};
}

function carregarRelacoesExatasF2_(aba,ufGeral,ufExatas,relacoes){
  lerAbaObjetosF2_(aba).forEach(r=>{
    const linhas=String(r.LINHAS_CADASTROS||'').split(',').map(x=>Number(String(x).trim())).filter(Number.isFinite);
    if(linhas.length<2)return;
    linhas.forEach(l=>{ufGeral.add(l);ufExatas.add(l);});
    const base=linhas[0];
    for(let i=1;i<linhas.length;i++){
      ufGeral.union(base,linhas[i]);ufExatas.union(base,linhas[i]);
      relacoes.push({origem:base,destino:linhas[i],tipo:'EXATA',scoreBase:1,scoreFinal:1,diferencas:''});
    }
  });
}

function carregarRelacoesQuaseF2_(aba,uf,relacoes){
  lerAbaObjetosF2_(aba).forEach(r=>{
    if(String(r.CLASSIFICACAO||'').trim()!=='CANDIDATO_ALTA_CONFIANCA')return;
    const a=Number(r.LINHA_A),b=Number(r.LINHA_B);
    if(!Number.isFinite(a)||!Number.isFinite(b))return;
    uf.add(a);uf.add(b);uf.union(a,b);
    relacoes.push({
      origem:a,destino:b,tipo:'QUASE',
      scoreBase:percentualNumeroF2_(r.SCORE_BASE),
      scoreFinal:percentualNumeroF2_(r.SCORE_FINAL),
      diferencas:r.DIFERENCAS_IDENTIFICADAS||''
    });
  });
}

function montarGruposGovernancaF2_(uf,relacoes,mapa){
  const mg=new Map();
  uf.elementos().forEach(l=>{
    const raiz=uf.find(l);
    if(!mg.has(raiz))mg.set(raiz,{linhas:new Set(),relacoes:[],possuiExata:false,possuiQuase:false,melhorScoreBase:0,melhorScoreFinal:0});
    mg.get(raiz).linhas.add(l);
  });

  relacoes.forEach(r=>{
    const g=mg.get(uf.find(r.origem));
    if(!g)return;
    g.relacoes.push(r);
    if(r.tipo==='EXATA')g.possuiExata=true;
    if(r.tipo==='QUASE')g.possuiQuase=true;
    g.melhorScoreBase=Math.max(g.melhorScoreBase,r.scoreBase||0);
    g.melhorScoreFinal=Math.max(g.melhorScoreFinal,r.scoreFinal||0);
  });

  const grupos=[];
  mg.forEach(g=>{
    const cadastros=[...g.linhas].map(l=>mapa.get(l)).filter(Boolean);
    if(cadastros.length<2)return;
    grupos.push({
      cadastros,relacoes:g.relacoes,possuiExata:g.possuiExata,possuiQuase:g.possuiQuase,
      melhorScoreBase:pctF2_(g.melhorScoreBase),melhorScoreFinal:pctF2_(g.melhorScoreFinal)
    });
  });

  grupos.sort((a,b)=>b.cadastros.length-a.cadastros.length || a.cadastros[0].saneada.localeCompare(b.cadastros[0].saneada));
  return grupos;
}

function montarNucleosExatosF2_(uf,mapa){
  const tmp=new Map();
  uf.elementos().forEach(l=>{
    const raiz=uf.find(l);
    if(!tmp.has(raiz))tmp.set(raiz,[]);
    tmp.get(raiz).push(l);
  });
  const out=new Map();let n=0;
  tmp.forEach(linhas=>{
    if(linhas.length<2)return;
    const id='EX-'+String(++n).padStart(4,'0');
    out.set(id,{id,linhas:new Set(linhas),cadastros:linhas.map(l=>mapa.get(l)).filter(Boolean)});
  });
  return out;
}

function construirIndiceNucleosF2_(nucleos){
  const m=new Map();
  nucleos.forEach((n,id)=>n.linhas.forEach(l=>m.set(l,id)));
  return m;
}

function escolherMestreF2_(cadastros){
  return cadastros.map(c=>{
    const a=normalizarComparacaoF2_(c.original),b=normalizarComparacaoF2_(c.saneada);
    return {cadastro:c,dist:distanciaLevenshteinF2_(a,b)/Math.max(a.length,b.length,1)};
  }).sort((x,y)=>x.dist-y.dist || x.cadastro.linha-y.cadastro.linha)[0].cadastro;
}

function montarEvidenciasGrupoF2_(g){
  return g.relacoes.map(r=>{
    let t=r.tipo+':'+r.origem+'↔'+r.destino;
    if(r.tipo==='QUASE'){
      t+=' SCORE='+pctF2_(r.scoreFinal);
      if(r.diferencas)t+=' ['+r.diferencas+']';
    }
    return t;
  }).join(' | ');
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function obterOuLimparAbaF2_(ss,nome){
  let aba=ss.getSheetByName(nome);
  if(!aba) aba=ss.insertSheet(nome);
  else{
    const filtro=aba.getFilter(); if(filtro)filtro.remove();
    aba.clear();
  }
  return aba;
}

function formatarGenericoF2_(aba,linhas,colunas){
  aba.setFrozenRows(1);
  aba.getRange(1,1,1,colunas).setFontWeight('bold');
  aba.getRange(1,1,linhas,colunas).setWrap(true);
  for(let c=1;c<=colunas;c++) aba.setColumnWidth(c,180);
  if(colunas>=3){
    aba.setColumnWidth(3,420);
    if(colunas>=4)aba.setColumnWidth(4,420);
    if(colunas>=6)aba.setColumnWidth(6,420);
    if(colunas>=7)aba.setColumnWidth(7,420);
  }
  if(linhas>1)aba.getRange(1,1,linhas,colunas).createFilter();
}

function lerAbaObjetosF2_(aba){
  const ul=aba.getLastRow(),uc=aba.getLastColumn();
  if(ul<2||uc<1)return[];
  const d=aba.getRange(1,1,ul,uc).getDisplayValues();
  const cab=d[0].map(x=>String(x).trim());
  return d.slice(1).map(r=>{
    const o={};cab.forEach((c,i)=>o[c]=r[i]);return o;
  });
}

function percentualNumeroF2_(v){
  const n=Number(String(v||'').replace('%','').replace(',','.').trim());
  return Number.isFinite(n)?n/100:0;
}

function pctF2_(v){
  return Number.isFinite(v)?(v*100).toFixed(1)+'%':'';
}

function normalizarComparacaoF2_(t){
  return semAcentoF2_(String(t||'').toUpperCase()).replace(/\s+/g,' ').trim();
}

function semAcentoF2_(t){
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g,'');
}

function unicosF2_(a){
  return [...new Set(a)];
}

function removerValorF2_(a,v){
  let i;while((i=a.indexOf(v))!==-1)a.splice(i,1);
}

function escF2_(t){
  return String(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function contemTermoF2_(texto,termo){
  return new RegExp('(^|[^A-Z0-9])'+escF2_(termo)+'(?=$|[^A-Z0-9])').test(String(texto).toUpperCase());
}

function distanciaLevenshteinF2_(a,b){
  if(a===b)return 0;
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  if(a.length>b.length){const t=a;a=b;b=t;}
  let ant=Array.from({length:a.length+1},(_,i)=>i);
  for(let j=1;j<=b.length;j++){
    const atu=[j];
    for(let i=1;i<=a.length;i++){
      const custo=a[i-1]===b[j-1]?0:1;
      atu[i]=Math.min(atu[i-1]+1,ant[i]+1,ant[i-1]+custo);
    }
    ant=atu;
  }
  return ant[a.length];
}



// ============================================================
// 2B.2 — QUALIDADE CADASTRAL + SUGESTÕES DE SIMILARES v1.1
// ============================================================
/**
 * Acrescenta em Cadastros:
 *   G = STATUS_QUALIDADE
 *   H = SUGESTOES_SIMILARES
 *
 * Regra segura de descrição insuficiente:
 * - a descrição saneada possui apenas 1 token significativo; e
 * - existe ao menos outro cadastro mais detalhado iniciado pelo
 *   mesmo token.
 *
 * IMPORTANTE:
 * DESCRICAO_INSUFICIENTE é um candidato para revisão/inativação,
 * não uma decisão automática de inativar nem uma equivalência
 * automática com qualquer sugestão.
 */
function analisarQualidadeESimilaresF2_(
  ss,
  abaCadastros
) {

  const ultima =
    abaCadastros.getLastRow();

  const quantidade =
    ultima - 1;

  if (
    quantidade <= 0
  ) {

    return {
      insuficientes: 0,
      comSugestoes: 0
    };
  }


  const dados =
    abaCadastros
      .getRange(
        2,
        1,
        quantidade,
        6
      )
      .getDisplayValues();


  const registros =
    dados.map(
      (r, i) => {

        const saneada =
          String(
            r[1] || ''
          ).trim();

        const tokens =
          tokensQualidadeF2_(
            saneada
          );

        return {
          linha: i + 2,
          original: String(r[0] || '').trim(),
          saneada: saneada,
          codigo: String(r[2] || '').trim(),
          descricaoNova: String(r[3] || '').trim(),
          statusGovernanca: String(r[4] || '').trim(),
          grupo: String(r[5] || '').trim(),
          tokens: tokens,
          semantica: saneada
            ? prepararRegistroF2_(i + 2, String(r[0] || '').trim(), saneada)
            : null
        };
      }
    );


  // ==========================================================
  // ÍNDICE PELO PRIMEIRO TOKEN SIGNIFICATIVO
  // ==========================================================

  const porPrimeiroToken =
    new Map();


  registros.forEach(
    r => {

      if (
        !r.saneada ||
        r.tokens.length === 0
      ) {

        return;
      }


      const chave =
        r.tokens[0];


      if (
        !porPrimeiroToken.has(
          chave
        )
      ) {

        porPrimeiroToken.set(
          chave,
          []
        );
      }


      porPrimeiroToken
        .get(
          chave
        )
        .push(
          r
        );
    }
  );


  // ==========================================================
  // SUGESTÕES ORIUNDAS DO DIAGNÓSTICO 2A.2
  // ==========================================================

  const sugestoesPorLinha =
    carregarSugestoesDoDiagnosticoF2_(
      ss,
      registros
    );


  // ==========================================================
  // COMPLEMENTA SUGESTÕES POR FAMÍLIA LEXICAL
  //
  // Busca descrições mais completas iniciadas pelo mesmo
  // termo principal, mesmo quando o blocking do 2A.2 não
  // colocou os dois itens no mesmo par.
  // ==========================================================

  adicionarSugestoesPorFamiliaF2_(
    registros,
    porPrimeiroToken,
    sugestoesPorLinha
  );


  const saida =
    [];

  const diagnostico =
    [[
      'LINHA_CADASTRO',
      'CODIGO_NOVO',
      'DESCRICAO_SANEADA',
      'STATUS_GOVERNANCA',
      'STATUS_QUALIDADE',
      'SUGESTOES_SIMILARES',
      'ACAO_SUGERIDA'
    ]];


  let insuficientes =
    0;

  let comSugestoes =
    0;


  registros.forEach(
    r => {

      if (
        !r.saneada
      ) {

        saida.push([
          '',
          ''
        ]);

        return;
      }


      let statusQualidade =
        '';


      const sugestoes =
        sugestoesPorLinha.get(
          r.linha
        ) || [];


      // ======================================================
      // DESCRIÇÃO INSUFICIENTE
      // ======================================================

      if (
        r.tokens.length === 1
      ) {

        const candidatosBase =
          (
            porPrimeiroToken.get(
              r.tokens[0]
            ) || []
          )
            .filter(
              outro =>
                outro.linha !== r.linha &&
                outro.tokens.length > 1
            )
            .sort(
              (a, b) =>
                a.tokens.length - b.tokens.length ||
                a.saneada.localeCompare(
                  b.saneada
                )
            );


        if (
          candidatosBase.length > 0
        ) {

          statusQualidade =
            'DESCRICAO_INSUFICIENTE';

          insuficientes++;


          candidatosBase
            .slice(
              0,
              5
            )
            .forEach(
              outro => {

                adicionarSugestaoF2_(
                  sugestoes,
                  {
                    linha: outro.linha,
                    codigo: outro.codigo,
                    descricao: outro.descricaoNova || outro.saneada,
                    score: null,
                    classificacao: 'MESMO_TERMO_BASE'
                  }
                );
              }
            );
        }
      }


      // ======================================================
      // MOSTRA ATÉ 3 SUGESTÕES
      //
      // Para mestres/de-para exatos a sugestão é desnecessária.
      // ======================================================

      let textoSugestoes =
        '';


      if (
        ![
          'MESTRE_PROVISORIO',
          'DE_PARA_EXATO'
        ].includes(
          r.statusGovernanca
        )
      ) {

        const ordenadas =
          sugestoes
            .slice()
            .sort(
              ordenarSugestoesF2_
            )
            .slice(
              0,
              3
            );


        textoSugestoes =
          ordenadas
            .map(
              s =>
                formatarSugestaoF2_(
                  s
                )
            )
            .join(
              ' || '
            );
      }


      if (
        textoSugestoes
      ) {

        comSugestoes++;
      }


      saida.push([
        statusQualidade,
        textoSugestoes
      ]);


      if (
        statusQualidade ||
        textoSugestoes
      ) {

        diagnostico.push([
          r.linha,
          r.codigo,
          r.saneada,
          r.statusGovernanca,
          statusQualidade,
          textoSugestoes,
          statusQualidade ===
          'DESCRICAO_INSUFICIENTE'
            ? 'REVISAR POSSIVEL INATIVACAO / COMPLEMENTAR DESCRICAO'
            : 'REVISAR PRODUTOS SIMILARES'
        ]);
      }
    }
  );


  // ==========================================================
  // GRAVA G:H
  // ==========================================================

  abaCadastros
    .getRange(
      1,
      7,
      1,
      2
    )
    .setValues([[
      'STATUS_QUALIDADE',
      'SUGESTOES_SIMILARES'
    ]]);


  abaCadastros
    .getRange(
      2,
      7,
      quantidade,
      2
    )
    .clearContent();


  abaCadastros
    .getRange(
      2,
      7,
      saida.length,
      2
    )
    .setValues(
      saida
    );


  abaCadastros.setColumnWidth(
    7,
    230
  );


  abaCadastros.setColumnWidth(
    8,
    750
  );


  // ==========================================================
  // DIAGNÓSTICO AUTOMÁTICO
  // ==========================================================

  const abaDiagnostico =
    obterOuLimparAbaF2_(
      ss,
      FASE2.ABA_QUALIDADE
    );


  abaDiagnostico
    .getRange(
      1,
      1,
      diagnostico.length,
      diagnostico[0].length
    )
    .setValues(
      diagnostico
    );


  formatarGenericoF2_(
    abaDiagnostico,
    diagnostico.length,
    diagnostico[0].length
  );


  abaDiagnostico.setColumnWidth(
    3,
    520
  );


  abaDiagnostico.setColumnWidth(
    6,
    800
  );


  return {
    insuficientes: insuficientes,
    comSugestoes: comSugestoes
  };
}


// ============================================================
// TOKENS PARA QUALIDADE
// ============================================================

function tokensQualidadeF2_(
  texto
) {

  const ignorar =
    new Set([
      'DE',
      'DA',
      'DO',
      'DAS',
      'DOS',
      'E',
      'PARA',
      'POR',
      'EM',
      'TIPO'
    ]);


  return String(
    texto || ''
  )
    .toUpperCase()
    .split(
      /\s+/
    )
    .map(
      t =>
        t.replace(
          /^[^A-Z0-9]+|[^A-Z0-9]+$/g,
          ''
        )
    )
    .filter(
      t =>
        t &&
        !ignorar.has(
          t
        )
    );
}


// ============================================================
// CARREGA SUGESTÕES DO 2A.2
// ============================================================

function carregarSugestoesDoDiagnosticoF2_(
  ss,
  registros
) {

  const mapa =
    new Map();


  const porLinha =
    new Map(
      registros.map(
        r => [
          r.linha,
          r
        ]
      )
    );


  const aba =
    ss.getSheetByName(
      FASE2.ABA_QUASE_DUP
    );


  if (!aba) {

    return mapa;
  }


  lerAbaObjetosF2_(
    aba
  ).forEach(
    r => {

      const linhaA =
        Number(
          r.LINHA_A
        );


      const linhaB =
        Number(
          r.LINHA_B
        );


      if (
        !Number.isFinite(
          linhaA
        ) ||
        !Number.isFinite(
          linhaB
        )
      ) {

        return;
      }


      const a =
        porLinha.get(
          linhaA
        );


      const b =
        porLinha.get(
          linhaB
        );


      if (
        !a ||
        !b
      ) {

        return;
      }


      // H não replica cegamente o 2A.2.
      // Só recebe candidatos semanticamente compatíveis e
      // que acrescentem informação útil à descrição de origem.
      const permiteAB =
        sugestaoSemanticamenteCompativelF2_(a, b) &&
        candidatoAdicionaInformacaoF2_(a, b);

      const permiteBA =
        sugestaoSemanticamenteCompativelF2_(b, a) &&
        candidatoAdicionaInformacaoF2_(b, a);


      const score =
        percentualNumeroF2_(
          r.SCORE_BASE
        );


      const classificacao =
        String(
          r.CLASSIFICACAO || ''
        ).trim();


      // ======================================================
      // V1.5 — H NÃO EXIBE CONFLITOS OU ESTRUTURA INCOMPLETA
      // ======================================================

      if (
        [
          'CONFLITO_ATRIBUTO_CRITICO',
          'ESTRUTURA_INCOMPLETA'
        ].includes(
          classificacao
        )
      ) {
        return;
      }


      if (
        permiteAB
      ) {

        adicionarSugestaoNoMapaF2_(
          mapa,
          linhaA,
          {
            linha: linhaB,
            codigo: b.codigo,
            descricao: b.descricaoNova || b.saneada,
            score: score,
            classificacao: classificacao
          }
        );
      }


      if (
        permiteBA
      ) {

        adicionarSugestaoNoMapaF2_(
          mapa,
          linhaB,
          {
            linha: linhaA,
            codigo: a.codigo,
            descricao: a.descricaoNova || a.saneada,
            score: score,
            classificacao: classificacao
          }
        );
      }
    }
  );


  return mapa;
}


function adicionarSugestaoNoMapaF2_(
  mapa,
  linha,
  sugestao
) {

  if (
    !mapa.has(
      linha
    )
  ) {

    mapa.set(
      linha,
      []
    );
  }


  adicionarSugestaoF2_(
    mapa.get(
      linha
    ),
    sugestao
  );
}


function adicionarSugestaoF2_(
  lista,
  sugestao
) {

  /*
   * V1.4:
   * Deduplicação por PRD quando disponível.
   * Se o candidato ainda não possui PRD, usa a descrição
   * normalizada como chave de fallback.
   */

  const chaveSugestao =
    sugestao.codigo
      ? 'COD|' + sugestao.codigo
      : 'DESC|' + normalizarComparacaoF2_(sugestao.descricao);


  const existente =
    lista.find(
      x => {

        const chaveExistente =
          x.codigo
            ? 'COD|' + x.codigo
            : 'DESC|' + normalizarComparacaoF2_(x.descricao);

        return chaveExistente === chaveSugestao;
      }
    );


  if (
    existente
  ) {

    const scoreNovo =
      sugestao.score === null
        ? -1
        : sugestao.score;

    const scoreAtual =
      existente.score === null
        ? -1
        : existente.score;


    if (
      scoreNovo > scoreAtual
    ) {

      existente.score =
        sugestao.score;

      existente.classificacao =
        sugestao.classificacao;

      existente.linha =
        sugestao.linha;

      existente.descricao =
        sugestao.descricao;
    }


    return;
  }


  lista.push(
    sugestao
  );
}


// ============================================================
// SUGESTÕES POR FAMÍLIA LEXICAL — V1.4
// ============================================================

function adicionarSugestoesPorFamiliaF2_(
  registros,
  porPrimeiroToken,
  sugestoesPorLinha
) {

  registros.forEach(
    origem => {

      if (
        !origem.saneada ||
        !origem.tokens.length ||
        !origem.semantica
      ) {
        return;
      }


      // Mestres e DE/PARA exatos já têm identidade resolvida.
      if (
        [
          'MESTRE_PROVISORIO',
          'DE_PARA_EXATO'
        ].includes(
          origem.statusGovernanca
        )
      ) {
        return;
      }


      const candidatos =
        porPrimeiroToken.get(
          origem.tokens[0]
        ) || [];


      candidatos.forEach(
        candidato => {

          if (
            candidato.linha === origem.linha ||
            !candidato.saneada ||
            !candidato.semantica
          ) {
            return;
          }


          // Não sugere a própria identidade PRD.
          if (
            origem.codigo &&
            candidato.codigo &&
            origem.codigo === candidato.codigo
          ) {
            return;
          }


          if (
            !sugestaoSemanticamenteCompativelF2_(
              origem,
              candidato
            )
          ) {
            return;
          }


          if (
            !candidatoAdicionaInformacaoF2_(
              origem,
              candidato
            )
          ) {
            return;
          }


          const score =
            calcularScoreSugestaoF2_(
              origem,
              candidato
            );


          // V1.5:
          // O score já é dominado pela cobertura informacional.
          // Mantemos piso de 75% para evitar sugestões fracas.
          if (
            score < 0.75
          ) {
            return;
          }


          adicionarSugestaoNoMapaF2_(
            sugestoesPorLinha,
            origem.linha,
            {
              linha: candidato.linha,
              codigo: candidato.codigo,
              descricao: candidato.descricaoNova || candidato.saneada,
              score: score,
              classificacao: 'SUGESTAO_COMPATIVEL'
            }
          );
        }
      );
    }
  );
}


function sugestaoSemanticamenteCompativelF2_(
  origem,
  candidato
) {

  const a = origem.semantica;
  const b = candidato.semantica;


  // C/ GAS e S/ GAS são produtos distintos.
  const gasA = extrairEstadoGasF2_(origem.saneada);
  const gasB = extrairEstadoGasF2_(candidato.saneada);

  if (
    gasA &&
    gasB &&
    gasA !== gasB
  ) {
    return false;
  }


  // Pares explícitos COM/SEM para atributos funcionais.
  if (
    conflitoFuncionalExplicitoF2_(
      a.atributosCriticos,
      b.atributosCriticos
    )
  ) {
    return false;
  }


  // ==========================================================
  // V1.5 — CONTRADIÇÃO GENÉRICA C/ x S/ E COM x SEM
  //
  // Exemplos:
  // C/ ROSCA x S/ ROSCA
  // C/ TAMPA x S/ TAMPA
  // COM LOGO x SEM LOGO
  // ==========================================================

  if (
    conflitoComSemGenericoF2_(
      origem.saneada,
      candidato.saneada
    )
  ) {
    return false;
  }


  // ==========================================================
  // V1.5 — NÚMEROS EXPLÍCITOS INCOMPATÍVEIS
  //
  // Se ambos informam números, eles precisam ser equivalentes.
  // Isso bloqueia, por exemplo:
  // ARMARIO ... 8 PORTAS x ARMARIO ... 16 PORTAS
  //
  // Se somente um lado possui número, a sugestão pode continuar
  // como possível enriquecimento e será avaliada por cobertura.
  // ==========================================================

  if (
    conflitoNumericoExplicitoF2_(
      origem.saneada,
      candidato.saneada
    )
  ) {
    return false;
  }


  const gruposCriticos = [
    [a.tamanhos, b.tamanhos],
    [a.mangas, b.mangas],
    [a.generoModelo, b.generoModelo],
    [a.atributosEstruturais, b.atributosEstruturais],
    [a.modelosReferencias, b.modelosReferencias],
    [a.dimensoes, b.dimensoes],
    [a.quantidadesApresentacao, b.quantidadesApresentacao],
    [a.especificacoes, b.especificacoes],
    [a.medidas, b.medidas],
    [a.cores, b.cores],
    [a.marcas, b.marcas]
  ];


  for (
    const par of gruposCriticos
  ) {

    if (
      conflitoQuandoAmbosInformadosF2_(
        par[0],
        par[1]
      )
    ) {
      return false;
    }
  }


  return true;
}


function extrairEstadoGasF2_(
  texto
) {

  const t =
    normalizarComparacaoF2_(
      texto
    );


  if (
    /\bS\/\s*GAS\b/.test(t) ||
    /\bSEM\s+GAS\b/.test(t)
  ) {
    return 'SEM_GAS';
  }


  if (
    /\bC\/\s*GAS\b/.test(t) ||
    /\bCOM\s+GAS\b/.test(t)
  ) {
    return 'COM_GAS';
  }


  return '';
}


function conflitoFuncionalExplicitoF2_(
  atributosA,
  atributosB
) {

  const a = new Set(atributosA || []);
  const b = new Set(atributosB || []);


  const pares = [
    ['COM_CABO', 'SEM_CABO'],
    ['COM_BOLSO', 'SEM_BOLSO'],
    ['COM_SUPORTE', 'SEM_SUPORTE'],
    ['COM_TAMPA', 'SEM_TAMPA'],
    ['COM_VALVULA', 'SEM_VALVULA'],
    ['COM_ELASTICO', 'SEM_ELASTICO'],
    ['COM_CORDAO', 'SEM_CORDAO']
  ];


  return pares.some(
    par =>
      (
        a.has(par[0]) &&
        b.has(par[1])
      ) ||
      (
        a.has(par[1]) &&
        b.has(par[0])
      )
  );
}



// ============================================================
// V1.5 — CONTRADIÇÕES GENÉRICAS C/ x S/ E COM x SEM
// ============================================================

function conflitoComSemGenericoF2_(
  textoA,
  textoB
) {

  const a =
    extrairMarcadoresComSemF2_(
      textoA
    );

  const b =
    extrairMarcadoresComSemF2_(
      textoB
    );


  for (
    const complemento of a.com
  ) {

    if (
      b.sem.has(
        complemento
      )
    ) {
      return true;
    }
  }


  for (
    const complemento of a.sem
  ) {

    if (
      b.com.has(
        complemento
      )
    ) {
      return true;
    }
  }


  return false;
}


function extrairMarcadoresComSemF2_(
  texto
) {

  const t =
    normalizarComparacaoF2_(
      texto
    );


  const resultado = {
    com: new Set(),
    sem: new Set()
  };


  /*
   * Captura o primeiro termo significativo após:
   * C/ , S/ , COM , SEM
   *
   * O primeiro termo é intencionalmente conservador.
   * Exemplos:
   * C/ GAS      -> GAS
   * S/ ROSCA    -> ROSCA
   * COM LOGO    -> LOGO
   * SEM TAMPA   -> TAMPA
   */

  const regex =
    /\b(C\/|S\/|COM|SEM)\s+([A-Z0-9]+)/g;


  let match;


  while (
    (
      match =
        regex.exec(
          t
        )
    ) !== null
  ) {

    const marcador =
      match[1];

    const complemento =
      match[2];


    if (
      !complemento
    ) {
      continue;
    }


    if (
      marcador === 'C/' ||
      marcador === 'COM'
    ) {

      resultado.com.add(
        complemento
      );

    } else {

      resultado.sem.add(
        complemento
      );
    }
  }


  return resultado;
}


// ============================================================
// V1.5 — ASSINATURA NUMÉRICA EXPLÍCITA
// ============================================================

function conflitoNumericoExplicitoF2_(
  textoA,
  textoB
) {

  const numerosA =
    extrairNumerosComparaveisF2_(
      textoA
    );

  const numerosB =
    extrairNumerosComparaveisF2_(
      textoB
    );


  // Se somente um lado possui números, pode ser enriquecimento.
  if (
    numerosA.length === 0 ||
    numerosB.length === 0
  ) {
    return false;
  }


  if (
    numerosA.length !==
    numerosB.length
  ) {
    return true;
  }


  for (
    let i = 0;
    i < numerosA.length;
    i++
  ) {

    if (
      numerosA[i] !==
      numerosB[i]
    ) {
      return true;
    }
  }


  return false;
}


function extrairNumerosComparaveisF2_(
  texto
) {

  const t =
    normalizarComparacaoF2_(
      texto
    );


  const encontrados =
    t.match(
      /\d+(?:[.,]\d+)?/g
    ) || [];


  return encontrados
    .map(
      valor =>
        String(
          valor
        )
          .replace(
            ',',
            '.'
          )
    )
    .sort(
      (a, b) => {

        const na =
          Number(
            a
          );

        const nb =
          Number(
            b
          );


        if (
          Number.isFinite(
            na
          ) &&
          Number.isFinite(
            nb
          )
        ) {

          return na - nb;
        }


        return a.localeCompare(
          b
        );
      }
    );
}


function conflitoQuandoAmbosInformadosF2_(
  valoresA,
  valoresB
) {

  const a = new Set(valoresA || []);
  const b = new Set(valoresB || []);


  if (
    a.size === 0 ||
    b.size === 0
  ) {
    return false;
  }


  if (
    a.size !== b.size
  ) {
    return true;
  }


  for (
    const valor of a
  ) {

    if (
      !b.has(valor)
    ) {
      return true;
    }
  }


  return false;
}


function candidatoAdicionaInformacaoF2_(
  origem,
  candidato
) {

  const cobertura =
    calcularCoberturaInformacionalF2_(
      origem,
      candidato
    );


  const origemSet =
    new Set(
      origem.tokens
    );


  const candidatoSet =
    new Set(
      candidato.tokens
    );


  const acrescentaToken =
    candidatoSet.size >
    origemSet.size;


  const descricaoMaior =
    normalizarComparacaoF2_(
      candidato.saneada
    ).length >
    normalizarComparacaoF2_(
      origem.saneada
    ).length;


  /*
   * V1.5:
   * Para H, o candidato deve preservar praticamente toda a
   * informação da origem. O piso de 90% evita sugestões laterais,
   * mas permite diferenças de ordem e inclusão de qualificadores.
   *
   * Exemplo:
   * AGUA 500 ML C/ GAS
   * -> AGUA MINERAL C/ GAS 500 ML
   *
   * cobertura = 100%
   */

  return (
    cobertura >= 0.90 &&
    (
      acrescentaToken ||
      descricaoMaior
    )
  );
}


function calcularCoberturaInformacionalF2_(
  origem,
  candidato
) {

  const origemSet =
    new Set(
      origem.tokens
    );


  const candidatoSet =
    new Set(
      candidato.tokens
    );


  if (
    origemSet.size === 0
  ) {
    return 0;
  }


  let presentes =
    0;


  origemSet.forEach(
    token => {

      if (
        candidatoSet.has(
          token
        )
      ) {
        presentes++;
      }
    }
  );


  return (
    presentes /
    origemSet.size
  );
}


function calcularScoreSugestaoF2_(
  origem,
  candidato
) {

  const cobertura =
    calcularCoberturaInformacionalF2_(
      origem,
      candidato
    );


  const simTokens =
    similaridadeTokensF2_(
      origem.semantica.textoMatching,
      candidato.semantica.textoMatching
    );


  const simTexto =
    similaridadeTextoF2_(
      origem.semantica.textoMatching,
      candidato.semantica.textoMatching
    );


  /*
   * V1.5:
   * Cobertura da origem é o fator principal.
   * A ordem textual passa a ter peso pequeno.
   */

  return (
    cobertura * 0.65 +
    simTokens * 0.25 +
    simTexto * 0.10
  );
}


function ordenarSugestoesF2_(
  a,
  b
) {

  const scoreA =
    a.score === null
      ? -1
      : a.score;


  const scoreB =
    b.score === null
      ? -1
      : b.score;


  if (
    scoreA !== scoreB
  ) {

    return (
      scoreB -
      scoreA
    );
  }


  const prioridade = {
    'CANDIDATO_ALTA_CONFIANCA': 1,
    'CANDIDATO_MEDIA_CONFIANCA': 2,
    'SUGESTAO_COMPATIVEL': 3,
    'CANDIDATO_BAIXA_CONFIANCA': 4,
    'MESMO_TERMO_BASE': 5
  };


  return (
    (
      prioridade[
        a.classificacao
      ] || 99
    ) -
    (
      prioridade[
        b.classificacao
      ] || 99
    )
  );
}


function formatarSugestaoF2_(
  s
) {

  let texto =
    (
      s.codigo
        ? s.codigo + ' - '
        : ''
    ) +
    s.descricao;


  if (
    s.score !== null
  ) {

    texto +=
      ' [' +
      pctF2_(
        s.score
      ) +
      ' | ' +
      s.classificacao +
      ']';

  } else {

    texto +=
      ' [' +
      s.classificacao +
      ']';
  }


  return texto;
}


// ============================================================
// 2C.1 — CÓDIGO MESTRE + DE/PARA v1.1
// ============================================================

const CONFIG_2C1 = {

  ABA_CADASTROS:
    'Cadastros',

  ABA_GOVERNANCA:
    'Proposta_Cadastro_Mestre',

  ABA_MAPA:
    'Mapa_Codigos_Mestre',

  LINHA_INICIAL:
    2,

  COLUNA_ORIGINAL:
    1,

  COLUNA_SANEADA:
    2,

  COLUNA_CODIGO_NOVO:
    3,

  COLUNA_DESCRICAO_NOVA:
    4,

  COLUNA_STATUS:
    5,

  COLUNA_GRUPO:
    6,

  PREFIXO_CODIGO:
    'PRD-',

  DIGITOS_CODIGO:
    6
};


// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

function gerarDeParaCodigoMestre2C1(silencioso) {

  silencioso = silencioso === true;

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const abaCadastros =
    ss.getSheetByName(
      CONFIG_2C1.ABA_CADASTROS
    );


  const abaGovernanca =
    ss.getSheetByName(
      CONFIG_2C1.ABA_GOVERNANCA
    );


  if (!abaCadastros) {

    throw new Error(
      'A aba "Cadastros" não foi encontrada.'
    );
  }


  if (!abaGovernanca) {

    throw new Error(
      'A aba "' +
      CONFIG_2C1.ABA_GOVERNANCA +
      '" não foi encontrada.\n\n' +
      'Execute primeiro o Script Mestre da Fase 2.'
    );
  }


  const ultimaLinha =
    abaCadastros.getLastRow();


  if (
    ultimaLinha <
    CONFIG_2C1.LINHA_INICIAL
  ) {

    throw new Error(
      'Não existem cadastros para processar.'
    );
  }


  const quantidade =
    ultimaLinha -
    CONFIG_2C1.LINHA_INICIAL +
    1;


  // ==========================================================
  // LÊ A/B
  // ==========================================================

  const dadosCadastros =
    abaCadastros
      .getRange(
        CONFIG_2C1.LINHA_INICIAL,
        CONFIG_2C1.COLUNA_ORIGINAL,
        quantidade,
        2
      )
      .getDisplayValues();


  // ==========================================================
  // CARREGA GOVERNANÇA 2B.1
  // ==========================================================

  const governancaPorLinha =
    carregarGovernancaPorLinha2C1(
      abaGovernanca
    );


  // ==========================================================
  // MAPA PERSISTENTE DE CÓDIGOS
  // ==========================================================

  const abaMapa =
    obterOuCriarMapaCodigos2C1(
      ss
    );


  const estadoMapa =
    carregarMapaCodigos2C1(
      abaMapa
    );


  let proximoNumero =
    estadoMapa.maiorNumero +
    1;


  const novasIdentidades =
    [];


  const resultado =
    [];


  let totalProcessados =
    0;

  let totalUnicos =
    0;

  let totalMestres =
    0;

  let totalDeParaExato =
    0;

  let totalRevisar =
    0;

  let codigosNovosCriados =
    0;

  let codigosReutilizados =
    0;


  // ==========================================================
  // PROCESSA TODAS AS LINHAS DE CADASTROS
  // ==========================================================

  dadosCadastros.forEach(
    (linha, indice) => {

      const numeroLinha =
        indice +
        CONFIG_2C1.LINHA_INICIAL;


      const original =
        String(
          linha[0] || ''
        ).trim();


      const saneada =
        String(
          linha[1] || ''
        ).trim();


      // Linha completamente vazia
      if (
        !original &&
        !saneada
      ) {

        resultado.push([
          '',
          '',
          '',
          ''
        ]);

        return;
      }


      if (!saneada) {

        resultado.push([
          '',
          '',
          'SEM_DESCRICAO_SANEADA',
          ''
        ]);

        return;
      }


      totalProcessados++;


      const gov =
        governancaPorLinha.get(
          numeroLinha
        );


      const identidade =
        construirIdentidade2C1(
          numeroLinha,
          original,
          saneada,
          gov
        );


      let codigo =
        estadoMapa.porChave.get(
          identidade.chave
        );


      // ======================================================
      // CÓDIGO JÁ EXISTENTE
      // ======================================================

      if (codigo) {

        codigosReutilizados++;


      // ======================================================
      // NOVA IDENTIDADE
      // ======================================================

      } else {

        codigo =
          gerarCodigo2C1(
            proximoNumero
          );


        proximoNumero++;


        estadoMapa.porChave.set(
          identidade.chave,
          codigo
        );


        estadoMapa.porCodigo.set(
          codigo,
          identidade.chave
        );


        novasIdentidades.push({

          chave:
            identidade.chave,

          codigo:
            codigo,

          descricao:
            identidade.descricaoNova,

          tipo:
            identidade.tipoIdentidade,

          origem:
            identidade.origemChave
        });


        codigosNovosCriados++;
      }


      // ======================================================
      // CONTADORES
      // ======================================================

      if (
        identidade.status ===
        'CADASTRO_UNICO'
      ) {

        totalUnicos++;


      } else if (
        identidade.status ===
        'MESTRE_PROVISORIO'
      ) {

        totalMestres++;


      } else if (
        identidade.status ===
        'DE_PARA_EXATO'
      ) {

        totalDeParaExato++;


      } else if (
        identidade.status ===
        'REVISAR_EQUIVALENCIA'
      ) {

        totalRevisar++;
      }


      resultado.push([

        codigo,

        identidade.descricaoNova,

        identidade.status,

        identidade.grupoGovernanca

      ]);
    }
  );


  // ==========================================================
  // GRAVA NOVAS IDENTIDADES NO MAPA
  // ==========================================================

  if (
    novasIdentidades.length > 0
  ) {

    gravarNovasIdentidades2C1(
      abaMapa,
      novasIdentidades
    );
  }


  // ==========================================================
  // CABEÇALHOS C:F
  // ==========================================================

  abaCadastros
    .getRange(
      1,
      CONFIG_2C1.COLUNA_CODIGO_NOVO,
      1,
      4
    )
    .setValues([[
      'CODIGO_NOVO',
      'DESCRICAO_NOVA',
      'STATUS_GOVERNANCA',
      'GRUPO_GOVERNANCA'
    ]]);


  // ==========================================================
  // LIMPA RESULTADO ANTERIOR
  // ==========================================================

  if (
    abaCadastros.getMaxRows() >=
    CONFIG_2C1.LINHA_INICIAL
  ) {

    abaCadastros
      .getRange(
        CONFIG_2C1.LINHA_INICIAL,
        CONFIG_2C1.COLUNA_CODIGO_NOVO,
        abaCadastros.getMaxRows() -
        CONFIG_2C1.LINHA_INICIAL +
        1,
        4
      )
      .clearContent();
  }


  // ==========================================================
  // GRAVA C:F
  // ==========================================================

  abaCadastros
    .getRange(
      CONFIG_2C1.LINHA_INICIAL,
      CONFIG_2C1.COLUNA_CODIGO_NOVO,
      resultado.length,
      4
    )
    .setValues(
      resultado
    );


  // ==========================================================
  // FORMATAÇÃO
  // ==========================================================

  formatarSaida2C1(
    abaCadastros,
    ultimaLinha
  );


  formatarMapaCodigos2C1(
    abaMapa
  );


  // ==========================================================
  // RESUMO
  // ==========================================================

  if (!silencioso) {
    SpreadsheetApp
    .getUi()
    .alert(
      'Passo 2C.1 concluído.\n\n' +

      'Cadastros processados: ' +
      totalProcessados +
      '\n\n' +

      'Cadastros únicos: ' +
      totalUnicos +
      '\n' +

      'Mestres provisórios: ' +
      totalMestres +
      '\n' +

      'DE/PARA por duplicidade exata: ' +
      totalDeParaExato +
      '\n' +

      'Revisar equivalência: ' +
      totalRevisar +
      '\n\n' +

      'Novos códigos criados: ' +
      codigosNovosCriados +
      '\n' +

      'Códigos reutilizados: ' +
      codigosReutilizados +
      '\n\n' +

      'As colunas A e B não foram alteradas.'
    );
  }

  return {
    processados: totalProcessados,
    unicos: totalUnicos,
    mestres: totalMestres,
    deParaExato: totalDeParaExato,
    revisar: totalRevisar,
    novosCodigos: codigosNovosCriados,
    reutilizados: codigosReutilizados
  };
}


// ============================================================
// CARREGA GOVERNANÇA POR LINHA
// ============================================================

function carregarGovernancaPorLinha2C1(
  aba
) {

  const mapa =
    new Map();


  const dados =
    lerAbaComoObjetos2C1(
      aba
    );


  dados.forEach(
    registro => {

      const linha =
        Number(
          registro.LINHA_CADASTRO
        );


      if (
        !Number.isFinite(
          linha
        )
      ) {

        return;
      }


      mapa.set(
        linha,
        {

          grupo:
            String(
              registro.GRUPO_GOVERNANCA ||
              ''
            ).trim(),

          tipoGrupo:
            String(
              registro.TIPO_GRUPO ||
              ''
            ).trim(),

          nucleoExato:
            String(
              registro.NUCLEO_EXATO ||
              ''
            ).trim(),

          papel:
            String(
              registro.PAPEL_SUGERIDO ||
              ''
            ).trim(),

          linhaMestre:
            Number(
              registro.LINHA_MESTRE_PROVISORIA
            ) || null,

          descricaoMestre:
            String(
              registro.DESCRICAO_MESTRE_PROVISORIA ||
              ''
            ).trim()
        }
      );
    }
  );


  return mapa;
}


// ============================================================
// CONSTRÓI A IDENTIDADE DA LINHA
// ============================================================

function construirIdentidade2C1(
  numeroLinha,
  original,
  saneada,
  gov
) {

  // ==========================================================
  // SEM GRUPO DE GOVERNANÇA
  // ==========================================================

  if (!gov) {

    return {

      chave:
        construirChaveIndividual2C1(
          original,
          saneada
        ),

      descricaoNova:
        saneada,

      status:
        'CADASTRO_UNICO',

      grupoGovernanca:
        '',

      tipoIdentidade:
        'INDIVIDUAL',

      origemChave:
        'DESCRICAO_ORIGINAL + DESCRICAO_SANEADA'
    };
  }


  // ==========================================================
  // NÚCLEO DE DUPLICIDADE EXATA
  // ==========================================================

  if (
    gov.nucleoExato
  ) {

    const descricaoMestre =
      gov.descricaoMestre ||
      saneada;


    /*
     * A identidade exata NÃO usa o ID EX-XXXX,
     * pois esse ID pode mudar se a ordem dos grupos mudar.
     *
     * A chave persistente é baseada na descrição mestre
     * saneada do núcleo exato.
     */

    const chaveExata =
      'EXATA|' +
      normalizarChave2C1(
        descricaoMestre
      );


    const status =
      gov.papel ===
      'MESTRE_PROVISORIO'
        ? 'MESTRE_PROVISORIO'
        : 'DE_PARA_EXATO';


    return {

      chave:
        chaveExata,

      descricaoNova:
        descricaoMestre,

      status:
        status,

      grupoGovernanca:
        gov.grupo,

      tipoIdentidade:
        'NUCLEO_EXATO',

      origemChave:
        'DESCRICAO_MESTRE_SANEADA'
    };
  }


  // ==========================================================
  // QUASE DUPLICIDADE AINDA NÃO VALIDADA
  // ==========================================================

  return {

    chave:
      construirChaveIndividual2C1(
        original,
        saneada
      ),

    descricaoNova:
      saneada,

    status:
      'REVISAR_EQUIVALENCIA',

    grupoGovernanca:
      gov.grupo,

    tipoIdentidade:
      'QUASE_NAO_VALIDADA',

    origemChave:
      'IDENTIDADE INDIVIDUAL ATE VALIDACAO'
  };
}


// ============================================================
// CHAVE INDIVIDUAL
// ============================================================

function construirChaveIndividual2C1(
  original,
  saneada
) {

  return (
    'INDIVIDUAL|' +
    normalizarChave2C1(
      original
    ) +
    '|' +
    normalizarChave2C1(
      saneada
    )
  );
}


// ============================================================
// NORMALIZA CHAVE
// ============================================================

function normalizarChave2C1(
  texto
) {

  /*
   * V1.1:
   * A chave de identidade preserva acentos e demais
   * diferenças gráficas relevantes.
   *
   * Exemplo:
   * ACUCAR != AÇUCAR
   *
   * A normalização aqui é apenas:
   * - caixa alta
   * - espaços internos
   */

  return String(
    texto || ''
  )
    .toUpperCase()

    .replace(
      /\s+/g,
      ' '
    )

    .trim();
}


// ============================================================
// MAPA PERSISTENTE
// ============================================================

function obterOuCriarMapaCodigos2C1(
  ss
) {

  const VERSAO_REGRA_MAPA =
    '2C1_v1.1';


  let aba =
    ss.getSheetByName(
      CONFIG_2C1.ABA_MAPA
    );


  if (!aba) {

    aba =
      ss.insertSheet(
        CONFIG_2C1.ABA_MAPA
      );


    inicializarMapaCodigos2C1(
      aba,
      VERSAO_REGRA_MAPA
    );


    return aba;
  }


  // ==========================================================
  // DETECTA MAPA LEGADO DA V1.0
  //
  // Se a versão não estiver registrada como 2C1_v1.1,
  // o mapa anterior é considerado incompatível e é
  // reconstruído automaticamente.
  // ==========================================================

  const versaoAtual =
    String(
      aba.getRange(
        'I2'
      ).getDisplayValue() || ''
    ).trim();


  if (
    versaoAtual !==
    VERSAO_REGRA_MAPA
  ) {

    const filtro =
      aba.getFilter();


    if (
      filtro
    ) {

      filtro.remove();
    }


    aba.clear();


    inicializarMapaCodigos2C1(
      aba,
      VERSAO_REGRA_MAPA
    );
  }


  return aba;
}


// ============================================================
// INICIALIZA MAPA DE CÓDIGOS
// ============================================================

function inicializarMapaCodigos2C1(
  aba,
  versao
) {

  aba
    .getRange(
      1,
      1,
      1,
      7
    )
    .setValues([[
      'CHAVE_IDENTIDADE',
      'CODIGO_NOVO',
      'DESCRICAO_NOVA_INICIAL',
      'TIPO_IDENTIDADE',
      'ORIGEM_CHAVE',
      'DATA_CRIACAO',
      'ATIVO_MAPA'
    ]]);


  aba
    .getRange(
      'I1'
    )
    .setValue(
      'VERSAO_REGRA'
    );


  aba
    .getRange(
      'I2'
    )
    .setValue(
      versao
    );


  aba.setFrozenRows(
    1
  );
}


// ============================================================
// CARREGA MAPA EXISTENTE
// ============================================================

function carregarMapaCodigos2C1(
  aba
) {

  const porChave =
    new Map();


  const porCodigo =
    new Map();


  let maiorNumero =
    0;


  const ultimaLinha =
    aba.getLastRow();


  if (
    ultimaLinha >= 2
  ) {

    const dados =
      aba
        .getRange(
          2,
          1,
          ultimaLinha - 1,
          7
        )
        .getDisplayValues();


    dados.forEach(
      linha => {

        const chave =
          String(
            linha[0] || ''
          ).trim();


        const codigo =
          String(
            linha[1] || ''
          ).trim();


        if (
          !chave ||
          !codigo
        ) {

          return;
        }


        porChave.set(
          chave,
          codigo
        );


        porCodigo.set(
          codigo,
          chave
        );


        const numero =
          extrairNumeroCodigo2C1(
            codigo
          );


        if (
          numero >
          maiorNumero
        ) {

          maiorNumero =
            numero;
        }
      }
    );
  }


  return {

    porChave:
      porChave,

    porCodigo:
      porCodigo,

    maiorNumero:
      maiorNumero
  };
}


// ============================================================
// GRAVA NOVAS IDENTIDADES
// ============================================================

function gravarNovasIdentidades2C1(
  aba,
  novasIdentidades
) {

  const agora =
    new Date();


  const linhas =
    novasIdentidades.map(
      item => [

        item.chave,

        item.codigo,

        item.descricao,

        item.tipo,

        item.origem,

        agora,

        'SIM'

      ]
    );


  aba
    .getRange(
      aba.getLastRow() + 1,
      1,
      linhas.length,
      7
    )
    .setValues(
      linhas
    );
}


// ============================================================
// GERA CÓDIGO
// ============================================================

function gerarCodigo2C1(
  numero
) {

  return (
    CONFIG_2C1.PREFIXO_CODIGO +
    String(
      numero
    ).padStart(
      CONFIG_2C1.DIGITOS_CODIGO,
      '0'
    )
  );
}


// ============================================================
// EXTRAI NÚMERO DO CÓDIGO
// ============================================================

function extrairNumeroCodigo2C1(
  codigo
) {

  const regex =
    new RegExp(
      '^' +
      escaparRegex2C1(
        CONFIG_2C1.PREFIXO_CODIGO
      ) +
      '(\\d+)$'
    );


  const match =
    String(
      codigo || ''
    ).match(
      regex
    );


  if (!match) {

    return 0;
  }


  const numero =
    Number(
      match[1]
    );


  return Number.isFinite(
    numero
  )
    ? numero
    : 0;
}


// ============================================================
// LÊ ABA POR CABEÇALHOS
// ============================================================

function lerAbaComoObjetos2C1(
  aba
) {

  const ultimaLinha =
    aba.getLastRow();


  const ultimaColuna =
    aba.getLastColumn();


  if (
    ultimaLinha < 2 ||
    ultimaColuna < 1
  ) {

    return [];
  }


  const dados =
    aba
      .getRange(
        1,
        1,
        ultimaLinha,
        ultimaColuna
      )
      .getDisplayValues();


  const cabecalhos =
    dados[0]
      .map(
        valor =>
          String(
            valor
          ).trim()
      );


  const resultado =
    [];


  for (
    let i = 1;
    i < dados.length;
    i++
  ) {

    const objeto =
      {};


    cabecalhos.forEach(
      (cabecalho, indice) => {

        objeto[
          cabecalho
        ] =
          dados[i][indice];
      }
    );


    resultado.push(
      objeto
    );
  }


  return resultado;
}


// ============================================================
// FORMATA CADASTROS
// ============================================================

function formatarSaida2C1(
  aba,
  ultimaLinha
) {

  aba
    .getRange(
      1,
      CONFIG_2C1.COLUNA_CODIGO_NOVO,
      1,
      4
    )
    .setFontWeight(
      'bold'
    );


  aba.setColumnWidth(
    CONFIG_2C1.COLUNA_CODIGO_NOVO,
    130
  );


  aba.setColumnWidth(
    CONFIG_2C1.COLUNA_DESCRICAO_NOVA,
    500
  );


  aba.setColumnWidth(
    CONFIG_2C1.COLUNA_STATUS,
    220
  );


  aba.setColumnWidth(
    CONFIG_2C1.COLUNA_GRUPO,
    150
  );


  if (
    ultimaLinha >=
    CONFIG_2C1.LINHA_INICIAL
  ) {

    aba
      .getRange(
        1,
        1,
        ultimaLinha,
        6
      )
      .setWrap(
        true
      );
  }


  aba.setFrozenRows(
    1
  );
}


// ============================================================
// FORMATA MAPA
// ============================================================

function formatarMapaCodigos2C1(
  aba
) {

  const ultimaLinha =
    aba.getLastRow();


  aba.setFrozenRows(
    1
  );


  aba
    .getRange(
      1,
      1,
      1,
      7
    )
    .setFontWeight(
      'bold'
    );


  if (
    ultimaLinha >= 1
  ) {

    aba
      .getRange(
        1,
        1,
        ultimaLinha,
        7
      )
      .setWrap(
        true
      );
  }


  aba.setColumnWidth(1, 650);
  aba.setColumnWidth(2, 130);
  aba.setColumnWidth(3, 500);
  aba.setColumnWidth(4, 190);
  aba.setColumnWidth(5, 320);
  aba.setColumnWidth(6, 170);
  aba.setColumnWidth(7, 120);


  const filtro =
    aba.getFilter();


  if (
    filtro
  ) {

    filtro.remove();
  }


  if (
    ultimaLinha > 1
  ) {

    aba
      .getRange(
        1,
        1,
        ultimaLinha,
        7
      )
      .createFilter();
  }
}


// ============================================================
// REGEX
// ============================================================

function escaparRegex2C1(
  texto
) {

  return String(
    texto
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}
