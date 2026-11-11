/* =========================================================
   relatorio-detalhes.js — cálculos do detalhamento de um mês
   Funções puras (sem DOM): usadas pelos tooltips dos gráficos
   e pelo painel "Detalhes do mês" em relatorios.js.
   ========================================================= */

/** Soma os valores de uma lista de transações */
function somarValores(lista) {
  return lista.reduce((soma, t) => soma + t.valor, 0);
}

/**
 * Agrupa por categoria, da maior para a menor.
 * @returns {{ nome: string, valor: number, percentual: number }[]}
 */
function agruparPorCategoria(lista, nomeDe) {
  const total = somarValores(lista);
  const somas = lista.reduce((acc, t) => {
    const nome = nomeDe(t.categoriaId);
    return { ...acc, [nome]: (acc[nome] || 0) + t.valor };
  }, {});

  return Object.entries(somas)
    .map(([nome, valor]) => ({
      nome,
      valor,
      percentual: total > 0 ? Math.round((valor / total) * 100) : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Resumo completo de um mês ("2026-07").
 * @param {object[]} transacoes  todas as transações (não é alterada)
 * @param {string} mes           mês no formato "AAAA-MM"
 * @param {(id: string) => string} nomeDe  nome da categoria pelo id
 */
function detalhesDoMes(transacoes, mes, nomeDe) {
  const doMes = transacoes
    .filter((t) => t.data.startsWith(mes))
    .sort((a, b) => a.data.localeCompare(b.data));

  const receitasLista = doMes.filter((t) => t.tipo === "receita");
  const despesasLista = doMes.filter((t) => t.tipo === "despesa");
  const receitas = somarValores(receitasLista);
  const despesas = somarValores(despesasLista);
  const saldo = receitas - despesas;

  return {
    mes,
    receitas,
    despesas,
    saldo,
    quantidade: doMes.length,
    // Quanto da receita sobrou no mês (%). Sem receita, não há taxa.
    taxaEconomia: receitas > 0 ? Math.round((saldo / receitas) * 100) : null,
    categoriasDespesa: agruparPorCategoria(despesasLista, nomeDe),
    categoriasReceita: agruparPorCategoria(receitasLista, nomeDe),
    transacoes: doMes,
  };
}

/** Variação em % de `anterior` para `atual`. null quando não há base (anterior = 0). */
function variacaoPercentual(atual, anterior) {
  if (!anterior) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

/** "2026-01" -> "2025-12" */
function mesAnterior(mes) {
  const [ano, m] = mes.split("-").map(Number);
  return m === 1 ? `${ano - 1}-12` : `${ano}-${String(m - 1).padStart(2, "0")}`;
}
