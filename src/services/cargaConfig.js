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

const ORDEM_DIAS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];
const BR_TIME_ZONE = 'America/Sao_Paulo';

// Dia efetivo considerando troca às 11h
// Regra: antes das 11h = dia atual; após 11h = próximo dia útil
// Sexta após 11h = Segunda (próxima semana)
// Fim de semana = Segunda
function getDiaEfetivo() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BR_TIME_ZONE,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());

  const weekday = parts.find(part => part.type === 'weekday')?.value;
  const hora = Number(parts.find(part => part.type === 'hour')?.value || 0) % 24;
  const diaMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dia = diaMap[weekday] ?? 1; // 0=Dom, 1=Seg, ..., 6=Sab
  const depoisDas11 = hora >= 11;

  // Fim de semana → Segunda
  if (dia === 0 || dia === 6) return 'Segunda';

  const nomes    = { 1: 'Segunda', 2: 'Terca', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
  const proximos = { 1: 'Terca',   2: 'Quarta', 3: 'Quinta', 4: 'Sexta', 5: 'Segunda' };

  if (depoisDas11) return proximos[dia]; // Sexta+11h → 'Segunda'
  return nomes[dia];
}

export function getLabelDia() {
  return getDiaEfetivo();
}

// Retorna os dias ordenados a partir do dia ativo (dia ativo primeiro)
export function getDiasOrdenados() {
  const diaAtivo = getDiaEfetivo();
  if (!diaAtivo) return ORDEM_DIAS;
  const idx = ORDEM_DIAS.indexOf(diaAtivo);
  if (idx === -1) return ORDEM_DIAS;
  return [...ORDEM_DIAS.slice(idx), ...ORDEM_DIAS.slice(0, idx)];
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
