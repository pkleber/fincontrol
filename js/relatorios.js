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

/** Redesenha os dois gráficos conforme o período */
function atualizarRelatorios() {
  // Garante que o período é válido (início <= fim)
  if (periodoInicio.value > periodoFim.value) {
    [periodoInicio.value, periodoFim.value] = [periodoFim.value, periodoInicio.value];
  }

  const transacoes = transacoesDoPeriodo();
  avisoVazio.hidden = transacoes.length > 0;

  const meses = listarMeses(periodoInicio.value, periodoFim.value);
  const totais = totaisPorMes(transacoes, meses);

  graficoReceitasDespesas("grafico-barras", totais);
  graficoEvolucaoSaldo("grafico-linha", totais);
}

/** Gera e baixa um CSV com as transações do período */
function exportarCSV() {
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
    // Aspas na descrição protegem contra ";" digitado pelo usuário
    linhas.push(`${t.data};${t.tipo};"${t.descricao}";${nomeCategoria(t.categoriaId)};${valor}`);
  });

  // \ufeff (BOM) faz o Excel reconhecer os acentos (UTF-8)
  const blob = new Blob(["\ufeff" + linhas.join("\n")], {
    type: "text/csv;charset=utf-8",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `fincontrol_${periodoInicio.value}_a_${periodoFim.value}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Período padrão: últimos 6 meses */
function definirPeriodoPadrao() {
  const hoje = new Date();
  const fim = hoje.toISOString().slice(0, 7);

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
