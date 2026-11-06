/* =========================================================
   app.js — inicialização do Dashboard
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Exibe o mês atual no cabeçalho
  const mesEl = document.getElementById("mes-atual");
  if (mesEl) mesEl.textContent = mesAtualExtenso();

  const mesAtual = mesAtualISO(); // "2026-07" (fuso local)
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
  const saldo = receitas - despesas;
  const saldoEl = document.getElementById("saldo-mes");
  saldoEl.textContent = formatarMoeda(saldo);
  saldoEl.classList.toggle("negativo", saldo < 0);

  // Gráfico de despesas por categoria (Fase 2)
  const temDespesas = doMes.some((t) => t.tipo === "despesa");
  const graficoVazio = document.getElementById("grafico-vazio");
  if (typeof Chart !== "undefined" && document.getElementById("grafico-categorias")) {
    if (temDespesas) {
      graficoDespesasPorCategoria("grafico-categorias", doMes);
    } else {
      document.querySelector(".grafico-container").hidden = true;
      graficoVazio.hidden = false;
    }
  }

  renderizarMetasDashboard();

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
      item.innerHTML = `<span>${escaparHtml(t.descricao)}</span>
        <span class="${classe}">${sinal} ${formatarMoeda(t.valor)}</span>`;
      item.classList.add("ultimas__item");
      lista.appendChild(item);
    });
  }
});

/** Painel "Progresso das metas": aparece só quando há metas cadastradas */
function renderizarMetasDashboard() {
  const painel = document.getElementById("painel-metas");
  const container = document.getElementById("dashboard-metas");
  if (!painel || !container) return;

  const metas = lerLista(STORAGE_CHAVES.metas)
    .slice()
    .sort((a, b) => a.prazo.localeCompare(b.prazo));

  painel.hidden = metas.length === 0;
  container.innerHTML = "";

  metas.forEach((meta) => {
    const percentual = meta.valorAlvo > 0
      ? Math.round((meta.valorAtual / meta.valorAlvo) * 100)
      : 0;
    const nome = escaparHtml(meta.nome);
    const item = document.createElement("article");
    item.className = "orcamento";
    item.innerHTML = `
      <div class="orcamento__cabecalho">
        <strong>${nome}</strong>
        <span>${formatarMoeda(meta.valorAtual)} de ${formatarMoeda(meta.valorAlvo)}</span>
      </div>
      <div class="barra" role="progressbar" aria-valuenow="${percentual}"
           aria-valuemin="0" aria-valuemax="100" aria-label="Progresso de ${nome}: ${percentual}%">
        <div class="barra__preenchida ${percentual >= 100 ? "barra--concluida" : ""}"
             style="width: ${Math.min(100, percentual)}%"></div>
      </div>
      <div class="orcamento__rodape card__detalhe">
        <span>${percentual}%</span>
        <span>até ${formatarDataBR(meta.prazo)}</span>
      </div>
    `;
    container.appendChild(item);
  });
}
