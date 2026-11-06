/* =========================================================
   graficos.js — integração com Chart.js (Fase 2)
   Funções reutilizáveis para os gráficos do app.
   Requer: Chart.js carregado via CDN antes deste arquivo.
   ========================================================= */

/** Lê uma variável CSS do tema ativo. Ex.: corTema("--cor-receita") */
function corTema(variavel) {
  return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
}

/** Mesma cor com transparência (aceita "#rrggbb") */
function comTransparencia(hex, alfa) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

/**
 * Paleta dos gráficos, lida das variáveis do tema na hora de desenhar.
 * Assim, claro e escuro usam as mesmas cores do resto da interface.
 */
function coresGrafico() {
  return [
    corTema("--cor-primaria"), corTema("--cor-receita"), corTema("--cor-alerta"),
    corTema("--cor-despesa"), corTema("--cor-texto-suave"), corTema("--cor-investimento"),
    "#7a5c8a", "#8a6d3d",
  ];
}

// Tamanhos de texto dos gráficos (px). No celular, um pouco menores.
const TELA_PEQUENA = window.matchMedia("(max-width: 720px)").matches;
const FONTE_GRAFICO = TELA_PEQUENA ? 12 : 14;
const FONTE_LEGENDA = TELA_PEQUENA ? 13 : 15;

/**
 * Texto, grades e bordas dos gráficos seguem o tema ativo.
 * Sem isso, o Chart.js usa Helvetica/Arial 12px em cinza claro:
 * pequeno, com fonte diferente do app e pouco contraste no escuro.
 */
function aplicarCoresPadraoGrafico() {
  if (typeof Chart === "undefined") return;
  Chart.defaults.color = corTema("--cor-texto");
  Chart.defaults.borderColor = corTema("--cor-borda");
  Chart.defaults.font.family = corTema("--fonte-corpo");
  Chart.defaults.font.size = FONTE_GRAFICO;

  // Legenda (Receitas / Despesas): maior, em negrito e com marcador arredondado
  Chart.defaults.plugins.legend.labels.font = { size: FONTE_LEGENDA, weight: "600" };
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.legend.labels.boxWidth = 14;
  Chart.defaults.plugins.legend.labels.boxHeight = 14;
  Chart.defaults.plugins.legend.labels.useBorderRadius = true;
  Chart.defaults.plugins.legend.labels.borderRadius = 3;

  // Tooltip mais legível
  Chart.defaults.plugins.tooltip.titleFont = { size: FONTE_GRAFICO, weight: "600" };
  Chart.defaults.plugins.tooltip.bodyFont = { size: FONTE_GRAFICO };
  Chart.defaults.plugins.tooltip.padding = 10;
}
aplicarCoresPadraoGrafico();

/** Valor curto para os eixos. Ex.: 6000 -> "R$ 6 mil", 1500000 -> "R$ 1,5 mi" */
function moedaCompacta(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1,
  });
}

// Instâncias criadas + como redesenhá-las (para destruir ao refazer
// e para trocar as cores quando o tema mudar com a página aberta)
const instanciasGraficos = {};

/**
 * Cria (ou recria) um gráfico em um canvas, destruindo o anterior.
 * `redesenhar` refaz o mesmo gráfico lendo de novo as cores do tema.
 */
function criarGrafico(canvasId, config, redesenhar) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (instanciasGraficos[canvasId]) {
    instanciasGraficos[canvasId].grafico.destroy();
  }
  const grafico = new Chart(canvas, config);
  instanciasGraficos[canvasId] = { grafico, redesenhar };
  return grafico;
}

/** Remove o gráfico de um canvas (ex.: período inválido nos relatórios) */
function limparGrafico(canvasId) {
  const instancia = instanciasGraficos[canvasId];
  if (!instancia) return;
  instancia.grafico.destroy();
  delete instanciasGraficos[canvasId];
}

// tema.js avisa quando o tema muda (ex.: modo "sistema" à noite)
document.addEventListener("fincontrol:tema", () => {
  aplicarCoresPadraoGrafico();
  Object.values(instanciasGraficos).forEach(({ redesenhar }) => redesenhar && redesenhar());
});

/** Agrupa as despesas por categoria -> { labels: [], valores: [] } */
function agruparDespesasPorCategoria(transacoes) {
  const somaPorCategoria = {};

  transacoes
    .filter((t) => t.tipo === "despesa")
    .forEach((t) => {
      const nome = nomeCategoria(t.categoriaId);
      somaPorCategoria[nome] = (somaPorCategoria[nome] || 0) + t.valor;
    });

  // Ordena da maior para a menor despesa
  const pares = Object.entries(somaPorCategoria).sort((a, b) => b[1] - a[1]);

  return {
    labels: pares.map(([nome]) => nome),
    valores: pares.map(([, valor]) => valor),
  };
}

const RE_MES_ISO = /^\d{4}-(0[1-9]|1[0-2])$/; // "2026-07"

/**
 * Gera a lista de meses (formato "2026-07") entre dois meses, inclusive.
 * Entrada vazia ou inválida retorna [] — antes, um campo de mês apagado
 * virava NaN e o laço abaixo nunca terminava (travava a aba).
 */
function listarMeses(mesInicio, mesFim) {
  if (!RE_MES_ISO.test(mesInicio) || !RE_MES_ISO.test(mesFim)) return [];
  const meses = [];
  let [ano, mes] = mesInicio.split("-").map(Number);
  const [anoFim, mesFimNum] = mesFim.split("-").map(Number);

  while (ano < anoFim || (ano === anoFim && mes <= mesFimNum)) {
    meses.push(`${ano}-${String(mes).padStart(2, "0")}`);
    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }
  return meses;
}

/** Formata "2026-07" como "jul/26" para os eixos dos gráficos */
function rotuloMes(mes) {
  const [ano, m] = mes.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`;
}

/** Soma receitas e despesas de cada mês da lista */
function totaisPorMes(transacoes, meses) {
  return meses.map((mes) => {
    const doMes = transacoes.filter((t) => t.data.startsWith(mes));
    return {
      mes,
      receitas: doMes.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0),
      despesas: doMes.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
    };
  });
}

// ---------- Gráficos prontos ----------

/** Pizza (doughnut): despesas por categoria */
function graficoDespesasPorCategoria(canvasId, transacoes) {
  const { labels, valores } = agruparDespesasPorCategoria(transacoes);
  const redesenhar = () => graficoDespesasPorCategoria(canvasId, transacoes);

  return criarGrafico(canvasId, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: coresGrafico(), borderColor: corTema("--cor-superficie"), borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatarMoeda(ctx.parsed)}`,
          },
        },
      },
    },
  }, redesenhar);
}

/** Barras: receitas x despesas por mês */
function graficoReceitasDespesas(canvasId, totais) {
  const redesenhar = () => graficoReceitasDespesas(canvasId, totais);

  return criarGrafico(canvasId, {
    type: "bar",
    data: {
      labels: totais.map((t) => rotuloMes(t.mes)),
      datasets: [
        { label: "Receitas", data: totais.map((t) => t.receitas), backgroundColor: corTema("--cor-receita") },
        { label: "Despesas", data: totais.map((t) => t.despesas), backgroundColor: corTema("--cor-despesa") },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { callback: (v) => moedaCompacta(v) } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatarMoeda(ctx.parsed.y)}`,
          },
        },
      },
    },
  }, redesenhar);
}

/** Linha: evolução do saldo acumulado no período */
function graficoEvolucaoSaldo(canvasId, totais) {
  let acumulado = 0;
  const saldos = totais.map((t) => {
    acumulado += t.receitas - t.despesas;
    return acumulado;
  });

  const redesenhar = () => graficoEvolucaoSaldo(canvasId, totais);

  return criarGrafico(canvasId, {
    type: "line",
    data: {
      labels: totais.map((t) => rotuloMes(t.mes)),
      datasets: [{
        label: "Saldo acumulado",
        data: saldos,
        borderColor: corTema("--cor-investimento"),
        backgroundColor: comTransparencia(corTema("--cor-investimento"), 0.15),
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { callback: (v) => moedaCompacta(v) } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => ` Saldo: ${formatarMoeda(ctx.parsed.y)}`,
          },
        },
      },
    },
  }, redesenhar);
}
