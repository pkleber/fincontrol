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

// Texto, grades e bordas dos gráficos seguem o tema ativo
if (typeof Chart !== "undefined") {
  Chart.defaults.color = corTema("--cor-texto-suave");
  Chart.defaults.borderColor = corTema("--cor-borda");
}

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
  });
}

/** Barras: receitas x despesas por mês */
function graficoReceitasDespesas(canvasId, totais) {
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
