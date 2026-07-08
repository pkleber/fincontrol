/* =========================================================
   app.js — inicialização do Dashboard
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Exibe o mês atual no cabeçalho
  const mesEl = document.getElementById("mes-atual");
  if (mesEl) mesEl.textContent = mesAtualExtenso();

  const mesAtual = new Date().toISOString().slice(0, 7); // "2026-07"
  const transacoes = lerLista(STORAGE_CHAVES.transacoes);
  const doMes = transacoes.filter((t) => t.data.startsWith(mesAtual));

  // Totais do mês
  const receitas = doMes
    .filter((t) => t.tipo === "receita")
    .reduce((soma, t) => soma + t.valor, 0);

  const despesas = doMes
    .filter((t) => t.tipo === "despesa")
    .reduce((soma, t) => soma + t.valor, 0);

  document.getElementById("total-receitas").textContent = formatarMoeda(receitas);
  document.getElementById("total-despesas").textContent = formatarMoeda(despesas);
  document.getElementById("saldo-mes").textContent = formatarMoeda(receitas - despesas);

  // Últimas 5 transações
  const lista = document.getElementById("lista-ultimas");
  const ultimas = [...transacoes]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  if (ultimas.length > 0) {
    lista.innerHTML = "";
    ultimas.forEach((t) => {
      const item = document.createElement("li");
      const sinal = t.tipo === "receita" ? "+" : "−";
      const classe = t.tipo === "receita" ? "valor--receita" : "valor--despesa";
      item.innerHTML = `<span>${t.descricao}</span>
        <span class="${classe}">${sinal} ${formatarMoeda(t.valor)}</span>`;
      item.classList.add("ultimas__item");
      lista.appendChild(item);
    });
  }
});
