/* =========================================================
   relatorios.js — gráficos por período e exportação CSV
   ========================================================= */

const periodoInicio = document.getElementById("periodo-inicio");
const periodoFim = document.getElementById("periodo-fim");
const botaoExportar = document.getElementById("botao-exportar");
const avisoVazio = document.getElementById("relatorio-vazio");

/** Retorna as transações dentro do período selecionado */
function transacoesDoPeriodo() {
  const inicio = periodoInicio.value;
  const fim = periodoFim.value;
  return lerLista(STORAGE_CHAVES.transacoes).filter((t) => {
    const mes = t.data.slice(0, 7);
    return mes >= inicio && mes <= fim;
  });
}

/** Limite do período: evita travar a aba com um ano digitado errado (ex.: 9999) */
const MAX_MESES_RELATORIO = 120; // 10 anos
const GRAFICOS_RELATORIO = ["grafico-barras", "grafico-linha"];

/** Quantos meses há entre "2026-01" e "2026-06", inclusive (= 6), só com contas */
function quantidadeDeMeses(mesInicio, mesFim) {
  const [anoIni, mesIni] = mesInicio.split("-").map(Number);
  const [anoFim, mesFimNum] = mesFim.split("-").map(Number);
  return (anoFim - anoIni) * 12 + (mesFimNum - mesIni) + 1;
}

/** Esconde os gráficos e mostra o aviso de período vazio */
function mostrarSemPeriodo() {
  GRAFICOS_RELATORIO.forEach(limparGrafico);
  avisoVazio.hidden = false;
  estado = { meses: [], detalhes: [], mesSelecionado: null };
  renderizarDetalhes();
}

/** Redesenha os dois gráficos conforme o período */
function atualizarRelatorios() {
  // Campo de mês apagado: não há período para mostrar
  if (!periodoInicio.value || !periodoFim.value) {
    mostrarSemPeriodo();
    return;
  }

  // Garante que o período é válido (início <= fim)
  if (periodoInicio.value > periodoFim.value) {
    [periodoInicio.value, periodoFim.value] = [periodoFim.value, periodoInicio.value];
  }

  // Confere o tamanho ANTES de gerar a lista de meses (que travaria a aba)
  if (quantidadeDeMeses(periodoInicio.value, periodoFim.value) > MAX_MESES_RELATORIO) {
    alert(`Escolha um período de até ${MAX_MESES_RELATORIO / 12} anos.`);
    mostrarSemPeriodo();
    return;
  }

  const meses = listarMeses(periodoInicio.value, periodoFim.value);
  if (meses.length === 0) {
    mostrarSemPeriodo();
    return;
  }

  const transacoes = transacoesDoPeriodo();
  avisoVazio.hidden = transacoes.length > 0;

  const totais = totaisPorMes(transacoes, meses);
  const todas = lerLista(STORAGE_CHAVES.transacoes);
  const detalhes = meses.map((mes) => detalhesDoMes(todas, mes, nomeCategoria));

  estado = { meses, detalhes, mesSelecionado: escolherMesInicial(meses, detalhes) };

  const opcoes = {
    detalhes,
    indiceSelecionado: () => {
      const i = estado.meses.indexOf(estado.mesSelecionado);
      return i === -1 ? null : i;
    },
    aoSelecionarMes: (mes) => selecionarMes(mes, { rolar: true }),
  };
  graficoReceitasDespesas("grafico-barras", totais, opcoes);
  graficoEvolucaoSaldo("grafico-linha", totais, opcoes);

  preencherSeletorDeMes(meses);
  renderizarDetalhes();
}

// ---------- Detalhes do mês ----------

const painelDetalhe = document.getElementById("detalhe-mes");
const seletorDetalhe = document.getElementById("detalhe-seletor");
const tituloDetalhe = document.getElementById("detalhe-titulo");
const resumoDetalhe = document.getElementById("detalhe-resumo");
const categoriasDetalhe = document.getElementById("detalhe-categorias");
const transacoesDetalhe = document.getElementById("detalhe-transacoes");

/** Estado da tela: meses do período, detalhes de cada um e o mês em foco */
let estado = { meses: [], detalhes: [], mesSelecionado: null };

/** Mantém o mês já escolhido se ainda estiver no período; senão, o último mês com movimento */
function escolherMesInicial(meses, detalhes) {
  if (estado.mesSelecionado && meses.includes(estado.mesSelecionado)) return estado.mesSelecionado;
  const comMovimento = detalhes.filter((d) => d.quantidade > 0);
  return comMovimento.length > 0 ? comMovimento.at(-1).mes : null;
}

/** Seleciona um mês (clique no gráfico ou no seletor) e atualiza o painel */
function selecionarMes(mes, { rolar = false } = {}) {
  if (!estado.meses.includes(mes)) return;
  estado = { ...estado, mesSelecionado: mes };
  GRAFICOS_RELATORIO.forEach(atualizarDestaqueGrafico);
  renderizarDetalhes();

  if (rolar) {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    painelDetalhe.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "nearest" });
  }
}

/** Opções do seletor: alternativa ao clique no gráfico (teclado e leitores de tela) */
function preencherSeletorDeMes(meses) {
  seletorDetalhe.innerHTML = [...meses].reverse()
    .map((mes) => `<option value="${mes}">${escaparHtml(mesPorExtenso(mes))}</option>`)
    .join("");
}

/** Texto e classe da variação contra o mês anterior. `subirEhBom` define a cor. */
function htmlVariacao(atual, anterior, subirEhBom, mesBase) {
  const variacao = variacaoPercentual(atual, anterior);
  if (variacao === null) return `<span class="variacao">sem base em ${rotuloMes(mesBase)}</span>`;
  if (variacao === 0) return `<span class="variacao">igual a ${rotuloMes(mesBase)}</span>`;
  const subiu = variacao > 0;
  const classe = subiu === subirEhBom ? "variacao--boa" : "variacao--ruim";
  return `<span class="variacao ${classe}">${subiu ? "▲" : "▼"} ${Math.abs(variacao)}% vs ${rotuloMes(mesBase)}</span>`;
}

function htmlCard(classe, titulo, valor, extra = "") {
  return `<div class="card ${classe}">
    <h3>${titulo}</h3>
    <p class="card__valor">${valor}</p>
    ${extra}
  </div>`;
}

/** Cards: receitas, despesas, saldo e economia, com comparação ao mês anterior */
function renderizarResumo(d) {
  const base = mesAnterior(d.mes);
  const anterior = detalhesDoMes(lerLista(STORAGE_CHAVES.transacoes), base, nomeCategoria);
  const classeSaldo = d.saldo < 0 ? "negativo" : "";

  resumoDetalhe.innerHTML = [
    htmlCard("card--receita", "Receitas", formatarMoeda(d.receitas), htmlVariacao(d.receitas, anterior.receitas, true, base)),
    htmlCard("card--despesa", "Despesas", formatarMoeda(d.despesas), htmlVariacao(d.despesas, anterior.despesas, false, base)),
    htmlCard("card--saldo", "Saldo do mês", `<span class="${classeSaldo}">${formatarMoeda(d.saldo)}</span>`,
      `<span class="variacao">${d.quantidade} transaç${d.quantidade === 1 ? "ão" : "ões"}</span>`),
    htmlCard("card--investimento", "Economia",
      d.taxaEconomia === null ? "—" : `${d.taxaEconomia}%`,
      `<span class="variacao">da receita que sobrou</span>`),
  ].join("");
}

/** Lista de categorias de despesa com barra proporcional */
function renderizarCategorias(d) {
  if (d.categoriasDespesa.length === 0) {
    categoriasDetalhe.innerHTML = `<li class="ultimas__vazio">Nenhuma despesa neste mês.</li>`;
    return;
  }
  categoriasDetalhe.innerHTML = d.categoriasDespesa.map((c) => `
    <li class="detalhe-categorias__item">
      <div class="detalhe-categorias__linha">
        <span>${escaparHtml(c.nome)}</span>
        <span><strong>${formatarMoeda(c.valor)}</strong> <span class="variacao">${c.percentual}%</span></span>
      </div>
      <div class="barra"><div class="barra__preenchida barra--alerta" style="width: ${c.percentual}%"></div></div>
    </li>`).join("");
}

/** Tabela com as transações do mês (mais antigas primeiro) */
function renderizarTransacoes(d) {
  if (d.transacoes.length === 0) {
    transacoesDetalhe.innerHTML = `<tr><td colspan="4" class="ultimas__vazio">Nenhuma transação neste mês.</td></tr>`;
    return;
  }
  transacoesDetalhe.innerHTML = d.transacoes.map((t) => {
    const receita = t.tipo === "receita";
    return `<tr>
      <td>${formatarDataBR(t.data)}</td>
      <td>${escaparHtml(t.descricao)}</td>
      <td>${escaparHtml(nomeCategoria(t.categoriaId))}</td>
      <td class="tabela__valor ${receita ? "valor--receita" : "valor--despesa"}">${receita ? "+" : "−"}${formatarMoeda(t.valor)}</td>
    </tr>`;
  }).join("");
}

/** Mostra (ou esconde) o painel com o mês em foco */
function renderizarDetalhes() {
  const detalhe = estado.detalhes.find((d) => d.mes === estado.mesSelecionado);
  painelDetalhe.hidden = !detalhe;
  if (!detalhe) return;

  seletorDetalhe.value = detalhe.mes;
  tituloDetalhe.textContent = `Detalhes de ${mesPorExtenso(detalhe.mes)}`;
  renderizarResumo(detalhe);
  renderizarCategorias(detalhe);
  renderizarTransacoes(detalhe);
}

/** Gera e baixa um CSV com as transações do período */
/**
 * Prepara um texto para uma célula CSV entre aspas.
 * - aspas internas são duplicadas (padrão CSV);
 * - textos começando com = + - @ viram texto puro (prefixo '),
 *   senão o Excel os executaria como fórmula (CSV injection).
 */
function celulaCSV(texto) {
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replaceAll('"', '""')}"`;
}

function exportarCSV() {
  if (!periodoInicio.value || !periodoFim.value) {
    alert("Escolha o mês inicial e o final do período.");
    return;
  }

  const transacoes = transacoesDoPeriodo()
    .sort((a, b) => a.data.localeCompare(b.data));

  if (transacoes.length === 0) {
    alert("Nenhuma transação no período para exportar.");
    return;
  }

  // Separador ";" e vírgula decimal: padrão que o Excel pt-BR entende
  const linhas = ["Data;Tipo;Descrição;Categoria;Valor"];
  transacoes.forEach((t) => {
    const valor = t.valor.toFixed(2).replace(".", ",");
    // Aspas protegem contra ";" digitado pelo usuário
    linhas.push(`${t.data};${t.tipo};${celulaCSV(t.descricao)};${celulaCSV(nomeCategoria(t.categoriaId))};${valor}`);
  });

  // \ufeff (BOM) faz o Excel reconhecer os acentos (UTF-8)
  const blob = new Blob(["\ufeff" + linhas.join("\n")], {
    type: "text/csv;charset=utf-8",
  });

  baixarArquivo(blob, `fincontrol_${periodoInicio.value}_a_${periodoFim.value}.csv`);
}

/** Período padrão: últimos 6 meses */
function definirPeriodoPadrao() {
  const hoje = new Date();
  const fim = mesAtualISO(); // fuso local

  const inicioData = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const inicio = `${inicioData.getFullYear()}-${String(inicioData.getMonth() + 1).padStart(2, "0")}`;

  periodoInicio.value = inicio;
  periodoFim.value = fim;
}

// ---------- Eventos ----------
periodoInicio.addEventListener("change", atualizarRelatorios);
periodoFim.addEventListener("change", atualizarRelatorios);
botaoExportar.addEventListener("click", exportarCSV);
seletorDetalhe.addEventListener("change", () => selecionarMes(seletorDetalhe.value));

// ---------- Inicialização ----------
definirPeriodoPadrao();
atualizarRelatorios();
