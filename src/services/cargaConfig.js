// Mapeamento completo de cidades por dia
export const CARGA_POR_DIA = {
  'Segunda': ['Pedreira', 'Amparo', 'Arcadas', 'Jaguariuna'],
  'Terca':   ['Itatiba', 'Morungaba', 'Monte Alegre do Sul', 'Pinhalzinho', '3 Pontes'],
  'Quarta':  ['Pedreira', 'Amparo', 'Arcadas', 'Jaguariuna'],
  'Quinta':  ['Itatiba', 'Morungaba', 'Tuiuti'],
  'Sexta':   ['Lindoia', 'Aguas de Lindoia', 'Monte Siao', 'Ouro Fino', 'Jacutinga'],
};

// Itapira aparece sempre, sem prefixo CARGA
export const CIDADE_SEMPRE = 'Itapira';

/**
 * Retorna o dia de carga efetivo agora.
 *
 * Regra: a carga do dia X fica ativa das 11h de X até as 11h de X+1.
 * Mapeamento:
 *   Sex ≥11h  → até Seg 11h  → Segunda
 *   Sab       → até Seg 11h  → Segunda
 *   Dom       → até Seg 11h  → Segunda
 *   Seg <11h  → ainda é carga de Seg  (transição ainda não ocorreu)
 *   Seg ≥11h  → Terca
 *   Ter <11h  → Terca
 *   Ter ≥11h  → Quarta
 *   Qua <11h  → Quarta
 *   Qua ≥11h  → Quinta
 *   Qui <11h  → Quinta
 *   Qui ≥11h  → Sexta
 *   Sex <11h  → Sexta
 */
function getDiaEfetivo() {
  const agora = new Date();
  const dia   = agora.getDay(); // 0=Dom,1=Seg,2=Ter,3=Qua,4=Qui,5=Sex,6=Sab
  const hora  = agora.getHours();
  const depois = hora >= 11;

  // Fim de semana ou sexta depois das 11h → carga de Segunda
  if (dia === 0 || dia === 6) return 'Segunda';
  if (dia === 5 && depois)    return 'Segunda';

  // Dias úteis
  const atual  = { 1: 'Segunda', 2: 'Terca', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
  const proximo = { 1: 'Terca',   2: 'Quarta', 3: 'Quinta', 4: 'Sexta',  5: 'Segunda' };

  return depois ? proximo[dia] : atual[dia];
}

export function getLabelDia() {
  return getDiaEfetivo();
}

// Verifica se uma cidade deve aparecer agora
export function cargaAtivaAgora(cargaValue) {
  if (!cargaValue) return false;
  // Itapira sempre ativa
  if (cargaValue === CIDADE_SEMPRE) return true;

  const diaEfetivo = getDiaEfetivo();
  if (!diaEfetivo) return false;

  // Extrai cidade do valor (ex: "CARGA - Pedreira" -> "Pedreira")
  const cidade = cargaValue.startsWith('CARGA - ')
    ? cargaValue.replace('CARGA - ', '')
    : cargaValue;

  const cidadesDoDia = CARGA_POR_DIA[diaEfetivo] || [];
  return cidadesDoDia.includes(cidade);
}
