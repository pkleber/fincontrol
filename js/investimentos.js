/* =========================================================
   investimentos.js — caixinhas atreladas ao CDI (Fase 5)
   Requer: utils.js e storage.js carregados antes.
   =========================================================

   Como o rendimento é estimado (valores BRUTOS):
   - CDI diário = (1 + CDI anual)^(1/252) − 1   (252 dias úteis/ano)
   - Taxa diária da caixinha = CDI diário × (% do CDI)
   - Cada aplicação/aporte rende juros compostos pelos dias úteis
     (seg–sex) entre a data dele e hoje. Feriados são ignorados.
   - Projeção futura: ~21 dias úteis por mês.
   - O CDI é o mesmo da tela de Configurações (config.cdiAnual).
*/

const DIAS_UTEIS_ANO = 252;
const DIAS_UTEIS_MES = 21;
const CDI_PADRAO = 10.5; // % a.a., usado até o usuário configurar
const MESES_PROJECAO = [6, 12];

// ---------- Elementos ----------
const configCdi = document.getElementById("config-cdi");
const totalAplicadoEl = document.getElementById("total-aplicado");
const totalAtualEl = document.getElementById("total-atual");
const totalRendimentoEl = document.getElementById("total-rendimento");
const formCaixinha = document.getElementById("form-caixinha");
const cxNome = document.getElementById("cx-nome");
const cxValor = document.getElementById("cx-valor");
const cxPercentual = document.getElementById("cx-percentual");
const cxData = document.getElementById("cx-data");
const cxSalvar = document.getElementById("cx-salvar");
const cxCancelar = document.getElementById("cx-cancelar");
const listaCaixinhas = document.getElementById("lista-caixinhas");
const caixinhasVazio = document.getElementById("caixinhas-vazio");

let caixinhaEmEdicao = null;

// ---------- CDI ----------

/** CDI anual em % (o salvo nas configurações, ou o padrão) */
function cdiAnual() {
  const cdi = lerConfig().cdiAnual;
  return typeof cdi === "number" && cdi >= 0 ? cdi : CDI_PADRAO;
}

function salvarCdi() {
  const valor = parseFloat(configCdi.value);
  if (isNaN(valor) || valor < 0) {
    alert("Informe uma taxa de CDI válida (número maior ou igual a zero).");
    configCdi.value = cdiAnual();
    return;
  }
  salvarConfig({ ...lerConfig(), cdiAnual: valor });
  renderizar();
}

// ---------- Cálculos ----------

/** Dias úteis (seg–sex) depois de `inicioISO` até `fimISO`, inclusive */
function diasUteisEntre(inicioISO, fimISO) {
  if (fimISO <= inicioISO) return 0;

  const data = new Date(inicioISO + "T12:00:00");
  const fim = new Date(fimISO + "T12:00:00");
  let dias = 0;
  while (data < fim) {
    data.setDate(data.getDate() + 1);
    const diaSemana = data.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return dias;
}

/** Taxa diária da caixinha, ex.: 100% do CDI de 10,5% a.a. ≈ 0,0397% ao dia */
function taxaDiaria(percentualCDI) {
  const cdiDiario = Math.pow(1 + cdiAnual() / 100, 1 / DIAS_UTEIS_ANO) - 1;
  return cdiDiario * (percentualCDI / 100);
}

/** Aplicação inicial + aportes, como uma lista de { data, valor } */
function fluxosDaCaixinha(caixinha) {
  return [
    { data: caixinha.dataAplicacao, valor: caixinha.valorAplicado },
    ...(caixinha.aportes || []),
  ];
}

/**
 * Resumo da caixinha hoje e projetado.
 * diasExtras: dias úteis a mais no futuro (0 = hoje).
 */
function calcularCaixinha(caixinha, diasExtras = 0) {
  const taxa = taxaDiaria(caixinha.percentualCDI);
  const hoje = hojeISO();
  const fluxos = fluxosDaCaixinha(caixinha);

  const aplicado = fluxos.reduce((soma, f) => soma + f.valor, 0);
  const atual = fluxos.reduce((soma, f) => {
    // Aportes com data futura ainda não renderam nada
    const dias = diasUteisEntre(f.data, hoje) + (f.data <= hoje ? diasExtras : 0);
    return soma + f.valor * Math.pow(1 + taxa, dias);
  }, 0);

  return { aplicado, atual, rendimento: atual - aplicado };
}

// ---------- Renderização ----------

function renderizarResumo(caixinhas) {
  const totais = caixinhas
    .map((c) => calcularCaixinha(c))
    .reduce(
      (soma, r) => ({
        aplicado: soma.aplicado + r.aplicado,
        atual: soma.atual + r.atual,
        rendimento: soma.rendimento + r.rendimento,
      }),
      { aplicado: 0, atual: 0, rendimento: 0 }
    );

  totalAplicadoEl.textContent = formatarMoeda(totais.aplicado);
  totalAtualEl.textContent = formatarMoeda(totais.atual);
  totalRendimentoEl.textContent = formatarMoeda(totais.rendimento);
}

function htmlProjecao(caixinha) {
  const linhas = MESES_PROJECAO.map((meses) => {
    const { atual } = calcularCaixinha(caixinha, meses * DIAS_UTEIS_MES);
    return `<span>Em ${meses} meses: <strong>${formatarMoeda(atual)}</strong></span>`;
  });
  return `<div class="projecao">${linhas.join("")}</div>`;
}

function renderizarCaixinhas(caixinhas) {
  listaCaixinhas.innerHTML = "";
  caixinhasVazio.hidden = caixinhas.length > 0;

  caixinhas.forEach((caixinha) => {
    const { aplicado, atual, rendimento } = calcularCaixinha(caixinha);
    const nome = escaparHtml(caixinha.nome);
    const qtdAportes = (caixinha.aportes || []).length;

    const card = document.createElement("article");
    card.className = "card card--investimento";
    card.innerHTML = `
      <div class="card__topo">
        <h4>${nome}</h4>
        <span class="card__tipo">${caixinha.percentualCDI}% do CDI</span>
      </div>
      <p class="card__valor">${formatarMoeda(atual)}</p>
      <p class="card__detalhe">
        Rendimento: <span class="rendimento valor--receita">+ ${formatarMoeda(rendimento)}</span>
      </p>
      <p class="card__detalhe">
        Aplicado ${formatarMoeda(aplicado)} desde ${formatarDataBR(caixinha.dataAplicacao)}
        ${qtdAportes > 0 ? ` · ${qtdAportes} aporte(s)` : ""}
      </p>
      ${htmlProjecao(caixinha)}
      <div class="card__acoes">
        <button class="botao botao--aporte" data-acao="aportar-caixinha" data-id="${caixinha.id}" aria-label="Fazer aporte em ${nome}">+ Aporte</button>
        <button class="botao botao--editar" data-acao="editar-caixinha" data-id="${caixinha.id}" aria-label="Editar ${nome}">✎</button>
        <button class="botao botao--excluir" data-acao="excluir-caixinha" data-id="${caixinha.id}" aria-label="Excluir ${nome}">✕</button>
      </div>
    `;
    listaCaixinhas.appendChild(card);
  });
}

function renderizar() {
  const caixinhas = lerLista(STORAGE_CHAVES.caixinhas);
  renderizarResumo(caixinhas);
  renderizarCaixinhas(caixinhas);
}

// ---------- CRUD ----------

function salvarCaixinha(evento) {
  evento.preventDefault();

  const dados = {
    nome: cxNome.value.trim(),
    valorAplicado: parseFloat(cxValor.value),
    percentualCDI: parseFloat(cxPercentual.value),
    dataAplicacao: cxData.value,
  };

  if (!dados.nome || !(dados.valorAplicado > 0) || !(dados.percentualCDI > 0) || !dados.dataAplicacao) {
    alert("Preencha nome, valor inicial, % do CDI (maiores que zero) e a data da aplicação.");
    return;
  }

  const caixinhas = lerLista(STORAGE_CHAVES.caixinhas);
  const atualizadas = caixinhaEmEdicao
    ? caixinhas.map((c) => (c.id === caixinhaEmEdicao ? { ...c, ...dados } : c)) // preserva aportes
    : [...caixinhas, { id: gerarId(), ...dados, aportes: [] }];

  salvarLista(STORAGE_CHAVES.caixinhas, atualizadas);
  cancelarEdicaoCaixinha();
  renderizar();
}

function iniciarEdicaoCaixinha(id) {
  const caixinha = lerLista(STORAGE_CHAVES.caixinhas).find((c) => c.id === id);
  if (!caixinha) return;

  caixinhaEmEdicao = id;
  cxNome.value = caixinha.nome;
  cxValor.value = caixinha.valorAplicado;
  cxPercentual.value = caixinha.percentualCDI;
  cxData.value = caixinha.dataAplicacao;
  cxSalvar.textContent = "Salvar alterações";
  cxCancelar.hidden = false;
  cxNome.focus();
}

function cancelarEdicaoCaixinha() {
  caixinhaEmEdicao = null;
  formCaixinha.reset();
  cxPercentual.value = 100;
  cxData.value = hojeISO();
  cxSalvar.textContent = "Criar caixinha";
  cxCancelar.hidden = true;
}

function excluirCaixinha(id) {
  if (!confirm("Excluir esta caixinha e todos os aportes dela?")) return;

  const caixinhas = lerLista(STORAGE_CHAVES.caixinhas).filter((c) => c.id !== id);
  salvarLista(STORAGE_CHAVES.caixinhas, caixinhas);
  if (id === caixinhaEmEdicao) cancelarEdicaoCaixinha();
  renderizar();
}

/** Registra um aporte com a data de hoje */
function aportarCaixinha(id) {
  const caixinhas = lerLista(STORAGE_CHAVES.caixinhas);
  const caixinha = caixinhas.find((c) => c.id === id);
  if (!caixinha) return;

  const valor = pedirValor(`Valor do aporte em "${caixinha.nome}" (R$):`);
  if (valor === null) return;

  const aporte = { data: hojeISO(), valor };
  const atualizadas = caixinhas.map((c) =>
    c.id === id ? { ...c, aportes: [...(c.aportes || []), aporte] } : c
  );
  salvarLista(STORAGE_CHAVES.caixinhas, atualizadas);
  renderizar();
}

// ---------- Eventos ----------
configCdi.addEventListener("change", salvarCdi);
formCaixinha.addEventListener("submit", salvarCaixinha);
cxCancelar.addEventListener("click", cancelarEdicaoCaixinha);

document.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;

  const { acao, id } = botao.dataset;
  if (acao === "aportar-caixinha") aportarCaixinha(id);
  if (acao === "editar-caixinha") iniciarEdicaoCaixinha(id);
  if (acao === "excluir-caixinha") excluirCaixinha(id);
});

// ---------- Inicialização ----------
configCdi.value = cdiAnual();
cxData.value = hojeISO();
renderizar();
