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

// Dia efetivo considerando troca às 11h
function getDiaEfetivo() {
  const agora = new Date();
  const dia = agora.getDay(); // 0=Dom, 6=Sab
  const hora = agora.getHours();
  const depoisDas11 = hora >= 11;

  // Fim de semana
  if (dia === 0 || dia === 6) return null;
  // Sexta depois das 11h — sem carga até segunda
  if (dia === 5 && depoisDas11) return null;

  const proximos = { 1: 'Terca', 2: 'Quarta', 3: 'Quinta', 4: 'Sexta', 5: null };
  const nomes    = { 1: 'Segunda', 2: 'Terca', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };

  if (depoisDas11) return proximos[dia];
  return nomes[dia];
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
