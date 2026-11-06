/* =========================================================
   contas.js — CRUD de contas e cartões (Fase 3)
   Saldo da conta calculado a partir das transações.
   Fatura do cartão calculada pelo dia de fechamento.
   =========================================================

   Regras adotadas (simplificação da Fase 3):
   - Saldo da conta = saldo inicial + receitas − despesas
     vinculadas àquela conta.
   - Despesas no cartão NÃO afetam o saldo da conta; elas
     compõem a fatura. O pagamento da fatura entrará como
     uma despesa na conta (melhoria futura).
*/

// ---------- Elementos: contas ----------
const formConta = document.getElementById("form-conta");
const contaNome = document.getElementById("conta-nome");
const contaTipo = document.getElementById("conta-tipo");
const contaSaldo = document.getElementById("conta-saldo");
const contaSalvar = document.getElementById("conta-salvar");
const contaCancelar = document.getElementById("conta-cancelar");
const listaContas = document.getElementById("lista-contas");
const contasVazio = document.getElementById("contas-vazio");

// ---------- Elementos: cartões ----------
const formCartao = document.getElementById("form-cartao");
const cartaoNome = document.getElementById("cartao-nome");
const cartaoLimite = document.getElementById("cartao-limite");
const cartaoFechamento = document.getElementById("cartao-fechamento");
const cartaoVencimento = document.getElementById("cartao-vencimento");
const cartaoConta = document.getElementById("cartao-conta");
const cartaoSalvar = document.getElementById("cartao-salvar");
const cartaoCancelar = document.getElementById("cartao-cancelar");
const listaCartoes = document.getElementById("lista-cartoes");
const cartoesVazio = document.getElementById("cartoes-vazio");

let contaEmEdicao = null;
let cartaoEmEdicao = null;

// ---------- Utilidades de data ----------

/** Quantos dias tem o mês (mes: 0-11) */
function diasNoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

/** Data ISO "2026-07-03" clampando o dia ao tamanho do mês */
function dataISO(ano, mes, dia) {
  const diaFinal = Math.min(dia, diasNoMes(ano, mes));
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

/** Dia seguinte a uma data ISO. Ex.: "2026-01-31" -> "2026-02-01" */
function diaSeguinte(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia + 1);
  return dataISO(data.getFullYear(), data.getMonth(), data.getDate());
}

/** Data de fechamento do cartão num mês (mes: 0-11, aceita -1 e 12) */
function fechamentoNoMes(ano, mes, diaFechamento) {
  const referencia = new Date(ano, mes, 1); // normaliza -1/12 para o ano certo
  return dataISO(referencia.getFullYear(), referencia.getMonth(), diaFechamento);
}

/**
 * Período da fatura ABERTA do cartão hoje.
 * A fatura fecha no dia `diaFechamento` (ou no último dia, em meses
 * mais curtos); compras depois disso entram na fatura seguinte.
 * O início é sempre o dia seguinte ao fechamento anterior — assim
 * faturas consecutivas nunca se sobrepõem (ex.: fechamento dia 31).
 * Retorna { inicio, fim } em ISO (ambos inclusivos).
 */
function periodoFaturaAtual(cartao) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth(); // 0-11
  const fech = cartao.diaFechamento;
  const fechEsteMes = fechamentoNoMes(ano, mes, fech);

  if (hoje.getDate() <= Number(fechEsteMes.slice(8))) {
    // Ainda estamos dentro da fatura que fecha neste mês
    return {
      inicio: diaSeguinte(fechamentoNoMes(ano, mes - 1, fech)),
      fim: fechEsteMes,
    };
  }

  // Fatura deste mês já fechou: a aberta vai até o fechamento do mês que vem
  return {
    inicio: diaSeguinte(fechEsteMes),
    fim: fechamentoNoMes(ano, mes + 1, fech),
  };
}

/** Formata "2026-07-03" como "03/07" */
function diaMes(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ---------- Cálculos ----------

/** Saldo atual de uma conta com base nas transações vinculadas */
function saldoDaConta(conta, transacoes) {
  return transacoes
    .filter((t) => t.contaId === conta.id)
    .reduce(
      (saldo, t) => saldo + (t.tipo === "receita" ? t.valor : -t.valor),
      conta.saldoInicial
    );
}

/** Total da fatura aberta de um cartão */
function faturaAtual(cartao, transacoes) {
  const { inicio, fim } = periodoFaturaAtual(cartao);
  const total = transacoes
    .filter((t) => t.cartaoId === cartao.id && t.data >= inicio && t.data <= fim)
    .reduce((soma, t) => soma + (t.tipo === "despesa" ? t.valor : -t.valor), 0);
  return { inicio, fim, total };
}

// ---------- Renderização ----------

const NOMES_TIPO = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  carteira: "Carteira",
};

function renderizarContas() {
  const contas = lerLista(STORAGE_CHAVES.contas);
  const transacoes = lerLista(STORAGE_CHAVES.transacoes);

  listaContas.innerHTML = "";
  contasVazio.hidden = contas.length > 0;

  contas.forEach((conta) => {
    const saldo = saldoDaConta(conta, transacoes);
    const card = document.createElement("article");
    card.className = "card card--conta";
    card.innerHTML = `
      <div class="card__topo">
        <h4>${escaparHtml(conta.nome)}</h4>
        <span class="card__tipo">${escaparHtml(NOMES_TIPO[conta.tipo] || conta.tipo)}</span>
      </div>
      <p class="card__valor ${saldo < 0 ? "negativo" : ""}">${formatarMoeda(saldo)}</p>
      <p class="card__detalhe">Saldo inicial: ${formatarMoeda(conta.saldoInicial)}</p>
      <div class="card__acoes">
        <button class="botao botao--editar" data-acao="editar-conta" data-id="${escaparHtml(conta.id)}" aria-label="Editar ${escaparHtml(conta.nome)}">✎</button>
        <button class="botao botao--excluir" data-acao="excluir-conta" data-id="${escaparHtml(conta.id)}" aria-label="Excluir ${escaparHtml(conta.nome)}">✕</button>
      </div>
    `;
    listaContas.appendChild(card);
  });

  // Atualiza o select de conta de pagamento do formulário de cartão
  const selecionada = cartaoConta.value;
  cartaoConta.innerHTML = '<option value="">— Nenhuma —</option>';
  contas.forEach((c) => {
    const opcao = document.createElement("option");
    opcao.value = c.id;
    opcao.textContent = c.nome;
    cartaoConta.appendChild(opcao);
  });
  cartaoConta.value = selecionada;
}

function renderizarCartoes() {
  const cartoes = lerLista(STORAGE_CHAVES.cartoes);
  const contas = lerLista(STORAGE_CHAVES.contas);
  const transacoes = lerLista(STORAGE_CHAVES.transacoes);

  listaCartoes.innerHTML = "";
  cartoesVazio.hidden = cartoes.length > 0;

  cartoes.forEach((cartao) => {
    const fatura = faturaAtual(cartao, transacoes);
    const usoPercentual = cartao.limite > 0
      ? Math.min(100, Math.round((fatura.total / cartao.limite) * 100))
      : 0;
    const contaVinculada = contas.find((c) => c.id === cartao.contaId);

    const card = document.createElement("article");
    card.className = "card card--cartao";
    card.innerHTML = `
      <div class="card__topo">
        <h4>${escaparHtml(cartao.nome)}</h4>
        <span class="card__tipo">Fecha dia ${cartao.diaFechamento} · vence dia ${cartao.diaVencimento}</span>
      </div>

      <p class="card__detalhe">Fatura atual (${diaMes(fatura.inicio)} – ${diaMes(fatura.fim)})</p>
      <p class="card__valor">${formatarMoeda(fatura.total)}</p>

      <div class="barra" role="progressbar" aria-valuenow="${usoPercentual}"
           aria-valuemin="0" aria-valuemax="100"
           aria-label="Uso do limite: ${usoPercentual}%">
        <div class="barra__preenchida ${usoPercentual >= 80 ? "barra--alerta" : ""}"
             style="width: ${usoPercentual}%"></div>
      </div>
      <p class="card__detalhe">
        ${usoPercentual}% do limite de ${formatarMoeda(cartao.limite)}
        ${contaVinculada ? ` · paga com ${escaparHtml(contaVinculada.nome)}` : ""}
      </p>

      <div class="card__acoes">
        <button class="botao botao--editar" data-acao="editar-cartao" data-id="${escaparHtml(cartao.id)}" aria-label="Editar ${escaparHtml(cartao.nome)}">✎</button>
        <button class="botao botao--excluir" data-acao="excluir-cartao" data-id="${escaparHtml(cartao.id)}" aria-label="Excluir ${escaparHtml(cartao.nome)}">✕</button>
      </div>
    `;
    listaCartoes.appendChild(card);
  });
}

// ---------- CRUD: contas ----------

function salvarConta(evento) {
  evento.preventDefault();

  const dados = {
    nome: contaNome.value.trim(),
    tipo: contaTipo.value,
    saldoInicial: parseFloat(contaSaldo.value),
  };

  if (!dados.nome || !Number.isFinite(dados.saldoInicial)) {
    alert("Preencha o nome da conta e um saldo inicial válido.");
    return;
  }

  const contas = lerLista(STORAGE_CHAVES.contas);

  if (contaEmEdicao) {
    const indice = contas.findIndex((c) => c.id === contaEmEdicao);
    if (indice !== -1) contas[indice] = { ...contas[indice], ...dados };
  } else {
    contas.push({ id: gerarId(), ...dados });
  }

  salvarLista(STORAGE_CHAVES.contas, contas);
  cancelarEdicaoConta();
  renderizarContas();
  renderizarCartoes(); // nomes de conta aparecem nos cartões
}

function iniciarEdicaoConta(id) {
  const conta = lerLista(STORAGE_CHAVES.contas).find((c) => c.id === id);
  if (!conta) return;

  contaEmEdicao = id;
  contaNome.value = conta.nome;
  contaTipo.value = conta.tipo;
  contaSaldo.value = conta.saldoInicial;
  contaSalvar.textContent = "Salvar alterações";
  contaCancelar.hidden = false;
  contaNome.focus();
}

function cancelarEdicaoConta() {
  contaEmEdicao = null;
  formConta.reset();
  contaSaldo.value = 0;
  contaSalvar.textContent = "Adicionar conta";
  contaCancelar.hidden = true;
}

function excluirConta(id) {
  const transacoes = lerLista(STORAGE_CHAVES.transacoes);
  const vinculadas = transacoes.filter((t) => t.contaId === id).length;

  const mensagem = vinculadas > 0
    ? `Esta conta tem ${vinculadas} transação(ões) vinculada(s), que ficarão sem conta. Excluir mesmo assim?`
    : "Excluir esta conta?";
  if (!confirm(mensagem)) return;

  // Desvincula as transações e os cartões antes de excluir
  transacoes.forEach((t) => { if (t.contaId === id) t.contaId = null; });
  salvarLista(STORAGE_CHAVES.transacoes, transacoes);

  const cartoes = lerLista(STORAGE_CHAVES.cartoes);
  cartoes.forEach((c) => { if (c.contaId === id) c.contaId = null; });
  salvarLista(STORAGE_CHAVES.cartoes, cartoes);

  const contas = lerLista(STORAGE_CHAVES.contas).filter((c) => c.id !== id);
  salvarLista(STORAGE_CHAVES.contas, contas);

  if (id === contaEmEdicao) cancelarEdicaoConta();
  renderizarContas();
  renderizarCartoes();
}

// ---------- CRUD: cartões ----------

function salvarCartao(evento) {
  evento.preventDefault();

  const dados = {
    nome: cartaoNome.value.trim(),
    limite: parseFloat(cartaoLimite.value),
    diaFechamento: parseInt(cartaoFechamento.value, 10),
    diaVencimento: parseInt(cartaoVencimento.value, 10),
    contaId: cartaoConta.value || null,
  };

  const diaValido = (dia) => Number.isInteger(dia) && dia >= 1 && dia <= 31;
  if (!dados.nome || !(dados.limite >= 0) ||
      !diaValido(dados.diaFechamento) || !diaValido(dados.diaVencimento)) {
    alert("Preencha nome, limite (zero ou mais) e dias de fechamento/vencimento entre 1 e 31.");
    return;
  }

  const cartoes = lerLista(STORAGE_CHAVES.cartoes);

  if (cartaoEmEdicao) {
    const indice = cartoes.findIndex((c) => c.id === cartaoEmEdicao);
    if (indice !== -1) cartoes[indice] = { ...cartoes[indice], ...dados };
  } else {
    cartoes.push({ id: gerarId(), ...dados });
  }

  salvarLista(STORAGE_CHAVES.cartoes, cartoes);
  cancelarEdicaoCartao();
  renderizarCartoes();
}

function iniciarEdicaoCartao(id) {
  const cartao = lerLista(STORAGE_CHAVES.cartoes).find((c) => c.id === id);
  if (!cartao) return;

  cartaoEmEdicao = id;
  cartaoNome.value = cartao.nome;
  cartaoLimite.value = cartao.limite;
  cartaoFechamento.value = cartao.diaFechamento;
  cartaoVencimento.value = cartao.diaVencimento;
  cartaoConta.value = cartao.contaId || "";
  cartaoSalvar.textContent = "Salvar alterações";
  cartaoCancelar.hidden = false;
  cartaoNome.focus();
}

function cancelarEdicaoCartao() {
  cartaoEmEdicao = null;
  formCartao.reset();
  cartaoSalvar.textContent = "Adicionar cartão";
  cartaoCancelar.hidden = true;
}

function excluirCartao(id) {
  const transacoes = lerLista(STORAGE_CHAVES.transacoes);
  const vinculadas = transacoes.filter((t) => t.cartaoId === id).length;

  const mensagem = vinculadas > 0
    ? `Este cartão tem ${vinculadas} transação(ões) vinculada(s), que ficarão sem cartão. Excluir mesmo assim?`
    : "Excluir este cartão?";
  if (!confirm(mensagem)) return;

  transacoes.forEach((t) => { if (t.cartaoId === id) t.cartaoId = null; });
  salvarLista(STORAGE_CHAVES.transacoes, transacoes);

  const cartoes = lerLista(STORAGE_CHAVES.cartoes).filter((c) => c.id !== id);
  salvarLista(STORAGE_CHAVES.cartoes, cartoes);

  if (id === cartaoEmEdicao) cancelarEdicaoCartao();
  renderizarCartoes();
}

// ---------- Eventos ----------
formConta.addEventListener("submit", salvarConta);
contaCancelar.addEventListener("click", cancelarEdicaoConta);
formCartao.addEventListener("submit", salvarCartao);
cartaoCancelar.addEventListener("click", cancelarEdicaoCartao);

// Delegação: um listener cobre os botões dos dois grids
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;

  const { acao, id } = botao.dataset;
  if (acao === "editar-conta") iniciarEdicaoConta(id);
  if (acao === "excluir-conta") excluirConta(id);
  if (acao === "editar-cartao") iniciarEdicaoCartao(id);
  if (acao === "excluir-cartao") excluirCartao(id);
});

// ---------- Inicialização ----------
renderizarContas();
renderizarCartoes();
