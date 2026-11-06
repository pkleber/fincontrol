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

  graficoReceitasDespesas("grafico-barras", totais);
  graficoEvolucaoSaldo("grafico-linha", totais);
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

// ---------- Inicialização ----------
definirPeriodoPadrao();
atualizarRelatorios();
