/* =========================================================
   transacoes.js — CRUD de transações (Fase 1)
   Criar, listar, editar e excluir transações.
   ========================================================= */

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
const campoPagamento = document.getElementById("campo-pagamento");
const botaoSalvar = document.getElementById("botao-salvar");
const botaoCancelar = document.getElementById("botao-cancelar");

// Guarda o id da transação em edição (null = modo "adicionar")
let idEmEdicao = null;

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

/** Preenche o select "Pagar com" com contas e cartões cadastrados */
function atualizarMeiosPagamento() {
  const contas = lerLista(STORAGE_CHAVES.contas);
  const cartoes = lerLista(STORAGE_CHAVES.cartoes);

  campoPagamento.innerHTML = '<option value="">— Não vincular —</option>';

  if (contas.length > 0) {
    const grupo = document.createElement("optgroup");
    grupo.label = "Contas";
    contas.forEach((c) => {
      const opcao = document.createElement("option");
      opcao.value = `conta:${c.id}`;
      opcao.textContent = c.nome;
      grupo.appendChild(opcao);
    });
    campoPagamento.appendChild(grupo);
  }

  if (cartoes.length > 0) {
    const grupo = document.createElement("optgroup");
    grupo.label = "Cartões";
    cartoes.forEach((c) => {
      const opcao = document.createElement("option");
      opcao.value = `cartao:${c.id}`;
      opcao.textContent = c.nome;
      grupo.appendChild(opcao);
    });
    campoPagamento.appendChild(grupo);
  }
}

/** Nome da conta/cartão de uma transação (para a tabela) */
function nomeMeioPagamento(t) {
  if (t.contaId) {
    const conta = lerLista(STORAGE_CHAVES.contas).find((c) => c.id === t.contaId);
    return conta ? conta.nome : "—";
  }
  if (t.cartaoId) {
    const cartao = lerLista(STORAGE_CHAVES.cartoes).find((c) => c.id === t.cartaoId);
    return cartao ? `💳 ${cartao.nome}` : "—";
  }
  return "—";
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
      <td>${nomeMeioPagamento(t)}</td>
      <td class="tabela__valor ${classeValor}">${sinal} ${formatarMoeda(t.valor)}</td>
      <td class="tabela__acoes">
        <button class="botao botao--editar" data-id="${t.id}" aria-label="Editar ${t.descricao}">✎</button>
        <button class="botao botao--excluir" data-id="${t.id}" aria-label="Excluir ${t.descricao}">✕</button>
      </td>
    `;
    corpoTabela.appendChild(linha);
  });
}

/** Coloca o formulário em modo de edição, preenchendo com a transação */
function iniciarEdicao(id) {
  const transacao = lerLista(STORAGE_CHAVES.transacoes).find((t) => t.id === id);
  if (!transacao) return;

  idEmEdicao = id;
  campoTipo.value = transacao.tipo;
  atualizarCategorias(); // recarrega as categorias do tipo antes de selecionar
  campoDescricao.value = transacao.descricao;
  campoValor.value = transacao.valor;
  campoData.value = transacao.data;
  campoCategoria.value = transacao.categoriaId;

  if (transacao.contaId) campoPagamento.value = `conta:${transacao.contaId}`;
  else if (transacao.cartaoId) campoPagamento.value = `cartao:${transacao.cartaoId}`;
  else campoPagamento.value = "";

  botaoSalvar.textContent = "Salvar alterações";
  botaoCancelar.hidden = false;
  campoDescricao.focus();
}

/** Sai do modo de edição e volta ao modo "adicionar" */
function cancelarEdicao() {
  idEmEdicao = null;
  form.reset();
  definirDatasPadrao();
  atualizarCategorias();
  botaoSalvar.textContent = "Adicionar transação";
  botaoCancelar.hidden = true;
}

/** Salva o formulário: adiciona nova transação ou atualiza a em edição */
function salvarTransacao(evento) {
  evento.preventDefault();

  const [tipoPagamento, idPagamento] = campoPagamento.value.split(":");

  const dados = {
    tipo: campoTipo.value,
    descricao: campoDescricao.value.trim(),
    valor: parseFloat(campoValor.value),
    data: campoData.value,
    categoriaId: campoCategoria.value,
    contaId: tipoPagamento === "conta" ? idPagamento : null,
    cartaoId: tipoPagamento === "cartao" ? idPagamento : null,
  };

  const transacoes = lerLista(STORAGE_CHAVES.transacoes);

  if (idEmEdicao) {
    // Atualiza a transação existente, preservando os demais campos
    const indice = transacoes.findIndex((t) => t.id === idEmEdicao);
    if (indice !== -1) {
      transacoes[indice] = { ...transacoes[indice], ...dados };
    }
  } else {
    transacoes.push({
      id: gerarId(),
      ...dados,
      recorrente: false,
    });
  }

  salvarLista(STORAGE_CHAVES.transacoes, transacoes);
  cancelarEdicao(); // limpa o formulário e volta ao modo padrão
  renderizarTabela();
}

/** Exclui uma transação pelo id */
function excluirTransacao(id) {
  const transacoes = lerLista(STORAGE_CHAVES.transacoes).filter((t) => t.id !== id);
  salvarLista(STORAGE_CHAVES.transacoes, transacoes);
  if (id === idEmEdicao) cancelarEdicao(); // evita editar algo que não existe mais
  renderizarTabela();
}

/** Define a data de hoje no formulário e o mês atual no filtro */
function definirDatasPadrao() {
  const hoje = new Date().toISOString().slice(0, 10); // "2026-07-08"
  campoData.value = hoje;
  if (!filtroMes.value) filtroMes.value = hoje.slice(0, 7); // "2026-07"
}

// ---------- Eventos ----------
campoTipo.addEventListener("change", atualizarCategorias);
form.addEventListener("submit", salvarTransacao);
botaoCancelar.addEventListener("click", cancelarEdicao);
filtroMes.addEventListener("change", renderizarTabela);

corpoTabela.addEventListener("click", (evento) => {
  const editar = evento.target.closest(".botao--editar");
  if (editar) {
    iniciarEdicao(editar.dataset.id);
    return;
  }

  const excluir = evento.target.closest(".botao--excluir");
  if (excluir && confirm("Excluir esta transação?")) {
    excluirTransacao(excluir.dataset.id);
  }
});

// ---------- Inicialização ----------
definirDatasPadrao();
atualizarCategorias();
atualizarMeiosPagamento();
renderizarTabela();
