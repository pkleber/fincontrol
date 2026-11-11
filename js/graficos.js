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


/** Formata "2026-07" como "julho de 2026" (título dos tooltips e do painel) */
function mesPorExtenso(mes) {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** "+R$ 1.200,00" / "−R$ 300,00" — sinal explícito para variações */
function moedaComSinal(valor) {
  const sinal = valor > 0 ? "+" : valor < 0 ? "−" : "";
  return `${sinal}${formatarMoeda(Math.abs(valor))}`;
}

// Opacidade das barras/pontos que NÃO são o mês selecionado
const ALFA_FORA_DE_FOCO = 0.35;
const RAIO_PONTO = 4;
const RAIO_PONTO_SELECIONADO = 8;
const DICA_CLIQUE = "Clique para ver os detalhes";

/**
 * Opções de interação compartilhadas pelos gráficos de relatório.
 * - tooltip por mês (mode "index"): basta passar o mouse na coluna;
 * - clique em qualquer ponto da coluna seleciona o mês;
 * - cursor de "mãozinha" quando há algo clicável.
 */
function interacaoPorMes(totais, aoSelecionarMes) {
  const indiceDoEvento = (evento, grafico) => {
    const [elemento] = grafico.getElementsAtEventForMode(evento, "index", { intersect: false }, false);
    return elemento ? elemento.index : null;
  };

  return {
    interaction: { mode: "index", intersect: false },
    onClick: (evento, _elementos, grafico) => {
      const indice = indiceDoEvento(evento, grafico);
      if (indice !== null && aoSelecionarMes) aoSelecionarMes(totais[indice].mes);
    },
    onHover: (evento, _elementos, grafico) => {
      const clicavel = aoSelecionarMes && indiceDoEvento(evento, grafico) !== null;
      grafico.canvas.style.cursor = clicavel ? "pointer" : "default";
    },
  };
}

/** Cor cheia no mês selecionado e esmaecida nos outros (sem seleção: todas cheias) */
function corComFoco(cor, indiceSelecionado) {
  return (ctx) => {
    const selecionado = indiceSelecionado();
    if (selecionado === null || ctx.dataIndex === selecionado) return cor;
    return comTransparencia(cor, ALFA_FORA_DE_FOCO);
  };
}

/** Linhas extras do tooltip das barras: saldo, economia, maior gasto, nº de transações */
function rodapeMes(detalhe) {
  if (!detalhe) return [];
  const linhas = [`Saldo do mês: ${moedaComSinal(detalhe.saldo)}`];
  if (detalhe.taxaEconomia !== null) linhas.push(`Economia: ${detalhe.taxaEconomia}% da receita`);
  const [maior] = detalhe.categoriasDespesa;
  if (maior) linhas.push(`Maior gasto: ${maior.nome} (${formatarMoeda(maior.valor)})`);
  linhas.push(`${detalhe.quantidade} transaç${detalhe.quantidade === 1 ? "ão" : "ões"}`);
  return linhas;
}

/**
 * Barras: receitas x despesas por mês.
 * @param {object[]} totais  saída de totaisPorMes
 * @param {{ detalhes?: object[], indiceSelecionado?: () => number|null,
 *           aoSelecionarMes?: (mes: string) => void }} opcoes
 */
function graficoReceitasDespesas(canvasId, totais, opcoes = {}) {
  const { detalhes = [], indiceSelecionado = () => null, aoSelecionarMes } = opcoes;
  const redesenhar = () => graficoReceitasDespesas(canvasId, totais, opcoes);

  return criarGrafico(canvasId, {
    type: "bar",
    data: {
      labels: totais.map((t) => rotuloMes(t.mes)),
      datasets: [
        { label: "Receitas", data: totais.map((t) => t.receitas), backgroundColor: corComFoco(corTema("--cor-receita"), indiceSelecionado), borderRadius: 4 },
        { label: "Despesas", data: totais.map((t) => t.despesas), backgroundColor: corComFoco(corTema("--cor-despesa"), indiceSelecionado), borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...interacaoPorMes(totais, aoSelecionarMes),
      scales: {
        y: { ticks: { callback: (v) => moedaCompacta(v) } },
      },
      plugins: {
        tooltip: {
          footerFont: { size: FONTE_GRAFICO, weight: "400" },
          callbacks: {
            title: ([item]) => mesPorExtenso(totais[item.dataIndex].mes),
            label: (ctx) => ` ${ctx.dataset.label}: ${formatarMoeda(ctx.parsed.y)}`,
            footer: ([item]) => [
              ...rodapeMes(detalhes[item.dataIndex]),
              ...(aoSelecionarMes ? ["", DICA_CLIQUE] : []),
            ],
          },
        },
      },
    },
  }, redesenhar);
}

/**
 * Linha: evolução do saldo acumulado no período.
 * Tooltip mostra também o resultado do mês e a variação do saldo.
 */
function graficoEvolucaoSaldo(canvasId, totais, opcoes = {}) {
  const { indiceSelecionado = () => null, aoSelecionarMes } = opcoes;
  const resultados = totais.map((t) => t.receitas - t.despesas);
  const saldos = resultados.reduce(
    (lista, resultado) => [...lista, (lista.at(-1) ?? 0) + resultado], [],
  );

  const redesenhar = () => graficoEvolucaoSaldo(canvasId, totais, opcoes);
  const cor = corTema("--cor-investimento");
  const raio = (ctx) => (ctx.dataIndex === indiceSelecionado() ? RAIO_PONTO_SELECIONADO : RAIO_PONTO);

  return criarGrafico(canvasId, {
    type: "line",
    data: {
      labels: totais.map((t) => rotuloMes(t.mes)),
      datasets: [{
        label: "Saldo acumulado",
        data: saldos,
        borderColor: cor,
        backgroundColor: comTransparencia(cor, 0.15),
        pointBackgroundColor: cor,
        pointBorderColor: corTema("--cor-superficie"),
        pointBorderWidth: 2,
        pointRadius: raio,
        pointHoverRadius: RAIO_PONTO_SELECIONADO,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...interacaoPorMes(totais, aoSelecionarMes),
      scales: {
        y: { ticks: { callback: (v) => moedaCompacta(v) } },
      },
      plugins: {
        tooltip: {
          footerFont: { size: FONTE_GRAFICO, weight: "400" },
          callbacks: {
            title: ([item]) => mesPorExtenso(totais[item.dataIndex].mes),
            label: (ctx) => ` Saldo acumulado: ${formatarMoeda(ctx.parsed.y)}`,
            afterLabel: (ctx) => {
              const t = totais[ctx.dataIndex];
              return [
                ` Resultado do mês: ${moedaComSinal(resultados[ctx.dataIndex])}`,
                ` (receitas ${formatarMoeda(t.receitas)} − despesas ${formatarMoeda(t.despesas)})`,
              ];
            },
            footer: () => (aoSelecionarMes ? ["", DICA_CLIQUE] : []),
          },
        },
      },
    },
  }, redesenhar);
}

/** Redesenha só o destaque (mês selecionado), sem repetir a animação de entrada */
function atualizarDestaqueGrafico(canvasId) {
  const instancia = instanciasGraficos[canvasId];
  if (instancia) instancia.grafico.update("none");
}
