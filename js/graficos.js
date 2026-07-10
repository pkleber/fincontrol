/* =========================================================
   graficos.js — integração com Chart.js (Fase 2)
   Funções reutilizáveis para os gráficos do app.
   Requer: Chart.js carregado via CDN antes deste arquivo.
   ========================================================= */

// Paleta dos gráficos, alinhada às variáveis do tema
const CORES_GRAFICO = [
  "#0f4c5c", "#1f7a5c", "#c98a1b", "#b3403f",
  "#5c6f7a", "#3d7ea6", "#7a5c8a", "#8a6d3d",
];

// Guarda as instâncias criadas para poder destruí-las ao refazer
const instanciasGraficos = {};

/** Cria (ou recria) um gráfico em um canvas, destruindo o anterior */
function criarGrafico(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (instanciasGraficos[canvasId]) {
    instanciasGraficos[canvasId].destroy();
  }
  instanciasGraficos[canvasId] = new Chart(canvas, config);
  return instanciasGraficos[canvasId];
}

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

/** Gera a lista de meses (formato "2026-07") entre dois meses, inclusive */
function listarMeses(mesInicio, mesFim) {
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

  return criarGrafico(canvasId, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: CORES_GRAFICO, borderWidth: 2 }],
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
  });
}

/** Barras: receitas x despesas por mês */
function graficoReceitasDespesas(canvasId, totais) {
  return criarGrafico(canvasId, {
    type: "bar",
    data: {
      labels: totais.map((t) => rotuloMes(t.mes)),
      datasets: [
        { label: "Receitas", data: totais.map((t) => t.receitas), backgroundColor: "#1f7a5c" },
        { label: "Despesas", data: totais.map((t) => t.despesas), backgroundColor: "#b3403f" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { callback: (v) => formatarMoeda(v) } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatarMoeda(ctx.parsed.y)}`,
          },
        },
      },
    },
  });
}

/** Linha: evolução do saldo acumulado no período */
function graficoEvolucaoSaldo(canvasId, totais) {
  let acumulado = 0;
  const saldos = totais.map((t) => {
    acumulado += t.receitas - t.despesas;
    return acumulado;
  });

  return criarGrafico(canvasId, {
    type: "line",
    data: {
      labels: totais.map((t) => rotuloMes(t.mes)),
      datasets: [{
        label: "Saldo acumulado",
        data: saldos,
        borderColor: "#0f4c5c",
        backgroundColor: "rgba(15, 76, 92, 0.10)",
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { callback: (v) => formatarMoeda(v) } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => ` Saldo: ${formatarMoeda(ctx.parsed.y)}`,
          },
        },
      },
    },
  });
}
