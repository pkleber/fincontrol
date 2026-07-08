/* =========================================================
   transacoes.js — CRUD de transações (Fase 1)
   ========================================================= */

// Categorias pré-definidas (Fase 1 — depois virão das Configurações)
const CATEGORIAS = [
  { id: "cat-alimentacao", nome: "Alimentação", tipo: "despesa" },
  { id: "cat-moradia",     nome: "Moradia",     tipo: "despesa" },
  { id: "cat-transporte",  nome: "Transporte",  tipo: "despesa" },
  { id: "cat-lazer",       nome: "Lazer",       tipo: "despesa" },
  { id: "cat-saude",       nome: "Saúde",       tipo: "despesa" },
  { id: "cat-outros-desp", nome: "Outros",      tipo: "despesa" },
  { id: "cat-salario",     nome: "Salário",     tipo: "receita" },
  { id: "cat-freela",      nome: "Freelance",   tipo: "receita" },
  { id: "cat-outros-rec",  nome: "Outros",      tipo: "receita" },
];

// ---------- Elementos da página ----------
const form = document.getElementById("form-transacao");
const campoTipo = document.getElementById("campo-tipo");
const campoDescricao = document.getElementById("campo-descricao");
const campoValor = document.getElementById("campo-valor");
const campoData = document.getElementById("campo-data");
const campoCategoria = document.getElementById("campo-categoria");
const corpoTabela = document.getElementById("corpo-tabela");
const tabelaVazia = document.getElementById("tabela-vazia");
const filtroMes = document.getElementById("filtro-mes");

// ---------- Funções ----------

/** Preenche o select de categorias conforme o tipo escolhido */
function atualizarCategorias() {
  const tipo = campoTipo.value;
  campoCategoria.innerHTML = "";
  CATEGORIAS.filter((c) => c.tipo === tipo).forEach((c) => {
    const opcao = document.createElement("option");
    opcao.value = c.id;
    opcao.textContent = c.nome;
    campoCategoria.appendChild(opcao);
  });
}

/** Retorna o nome de uma categoria pelo id */
function nomeCategoria(id) {
  const cat = CATEGORIAS.find((c) => c.id === id);
  return cat ? cat.nome : "—";
}

/** Renderiza a tabela com as transações do mês selecionado */
function renderizarTabela() {
  const mes = filtroMes.value; // formato "2026-07"
  const transacoes = lerLista(STORAGE_CHAVES.transacoes)
    .filter((t) => t.data.startsWith(mes))
    .sort((a, b) => b.data.localeCompare(a.data));

  corpoTabela.innerHTML = "";
  tabelaVazia.hidden = transacoes.length > 0;

  transacoes.forEach((t) => {
    const linha = document.createElement("tr");

    const dataBR = new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR");
    const classeValor = t.tipo === "receita" ? "valor--receita" : "valor--despesa";
    const sinal = t.tipo === "receita" ? "+" : "−";

    linha.innerHTML = `
      <td>${dataBR}</td>
      <td>${t.descricao}</td>
      <td>${nomeCategoria(t.categoriaId)}</td>
      <td class="tabela__valor ${classeValor}">${sinal} ${formatarMoeda(t.valor)}</td>
      <td><button class="botao botao--excluir" data-id="${t.id}" aria-label="Excluir ${t.descricao}">✕</button></td>
    `;
    corpoTabela.appendChild(linha);
  });
}

/** Adiciona uma nova transação a partir do formulário */
function adicionarTransacao(evento) {
  evento.preventDefault();

  const nova = {
    id: gerarId(),
    tipo: campoTipo.value,
    descricao: campoDescricao.value.trim(),
    valor: parseFloat(campoValor.value),
    data: campoData.value,
    categoriaId: campoCategoria.value,
    contaId: null,
    cartaoId: null,
    recorrente: false,
  };

  const transacoes = lerLista(STORAGE_CHAVES.transacoes);
  transacoes.push(nova);
  salvarLista(STORAGE_CHAVES.transacoes, transacoes);

  form.reset();
  definirDatasPadrao();
  atualizarCategorias();
  renderizarTabela();
}

/** Exclui uma transação pelo id */
function excluirTransacao(id) {
  const transacoes = lerLista(STORAGE_CHAVES.transacoes).filter((t) => t.id !== id);
  salvarLista(STORAGE_CHAVES.transacoes, transacoes);
  renderizarTabela();
}

/** Define a data de hoje no formulário e o mês atual no filtro */
function definirDatasPadrao() {
  const hoje = new Date().toISOString().slice(0, 10); // "2026-07-07"
  campoData.value = hoje;
  if (!filtroMes.value) filtroMes.value = hoje.slice(0, 7); // "2026-07"
}

// ---------- Eventos ----------
campoTipo.addEventListener("change", atualizarCategorias);
form.addEventListener("submit", adicionarTransacao);
filtroMes.addEventListener("change", renderizarTabela);

corpoTabela.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".botao--excluir");
  if (botao && confirm("Excluir esta transação?")) {
    excluirTransacao(botao.dataset.id);
  }
});

// ---------- Inicialização ----------
definirDatasPadrao();
atualizarCategorias();
renderizarTabela();
