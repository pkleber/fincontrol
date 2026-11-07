/* =========================================================
   metas.js — metas financeiras e orçamento mensal (Fase 4)
   Requer: utils.js, storage.js e categorias.js carregados antes.
   =========================================================

   Regras adotadas:
   - Meta: o usuário informa o valor atual e faz aportes rápidos
     pelo botão "+". O progresso é valorAtual / valorAlvo.
   - Orçamento: um limite por categoria de despesa e por mês.
     Definir de novo a mesma categoria+mês substitui o limite.
     O gasto é a soma das despesas daquela categoria no mês.
   - Alertas: 80% = atenção (âmbar), 100% = estourado (vermelho).
*/

const LIMITE_ATENCAO = 80;  // % a partir do qual o orçamento fica âmbar
const LIMITE_ESTOURO = 100; // % a partir do qual fica vermelho

// ---------- Elementos: metas ----------
const formMeta = document.getElementById("form-meta");
const metaNome = document.getElementById("meta-nome");
const metaAlvo = document.getElementById("meta-alvo");
const metaAtual = document.getElementById("meta-atual");
const metaPrazo = document.getElementById("meta-prazo");
const metaSalvar = document.getElementById("meta-salvar");
const metaCancelar = document.getElementById("meta-cancelar");
const listaMetas = document.getElementById("lista-metas");
const metasVazio = document.getElementById("metas-vazio");

// ---------- Elementos: orçamento ----------
const formOrcamento = document.getElementById("form-orcamento");
const orcCategoria = document.getElementById("orc-categoria");
const orcMes = document.getElementById("orc-mes");
const orcLimite = document.getElementById("orc-limite");
const orcFiltroMes = document.getElementById("orc-filtro-mes");
const listaOrcamentos = document.getElementById("lista-orcamentos");
const orcamentosVazio = document.getElementById("orcamentos-vazio");

let metaEmEdicao = null;

// ---------- Cálculos ----------

/** Percentual de conclusão da meta (0 a 100+) */
function percentualMeta(meta) {
  return meta.valorAlvo > 0 ? Math.round((meta.valorAtual / meta.valorAlvo) * 100) : 0;
}

/** Meses inteiros entre hoje e o prazo (mínimo 1, para dividir com segurança) */
function mesesAtePrazo(prazo) {
  const [anoHoje, mesHoje] = mesAtualISO().split("-").map(Number);
  const [anoPrazo, mesPrazo] = prazo.split("-").map(Number);
  return Math.max(1, (anoPrazo - anoHoje) * 12 + (mesPrazo - mesHoje));
}

/** Texto de situação da meta: concluída, vencida ou quanto guardar por mês */
function situacaoMeta(meta) {
  const falta = meta.valorAlvo - meta.valorAtual;
  if (falta <= 0) return "🎉 Meta concluída!";
  if (meta.prazo < hojeISO()) return `Prazo vencido · faltam ${formatarMoeda(falta)}`;

  const porMes = falta / mesesAtePrazo(meta.prazo);
  return `Faltam ${formatarMoeda(falta)} · guarde ${formatarMoeda(porMes)}/mês`;
}

/** Total gasto em uma categoria num mês ("2026-07") */
function gastoNaCategoria(categoriaId, mes, transacoes) {
  return transacoes
    .filter((t) => t.tipo === "despesa" && t.categoriaId === categoriaId && t.data.startsWith(mes))
    .reduce((soma, t) => soma + t.valor, 0);
}

/** Classe da barra conforme o percentual usado do orçamento */
function classeBarraOrcamento(percentual) {
  if (percentual >= LIMITE_ESTOURO) return "barra--alerta";
  if (percentual >= LIMITE_ATENCAO) return "barra--atencao";
  return "";
}

/** HTML de uma barra de progresso acessível (largura limitada a 100%) */
function barraProgresso(percentual, classe, rotulo) {
  const largura = Math.min(100, Math.max(0, percentual));
  return `
    <div class="barra" role="progressbar" aria-valuenow="${percentual}"
         aria-valuemin="0" aria-valuemax="100" aria-label="${escaparHtml(rotulo)}: ${percentual}%">
      <div class="barra__preenchida ${classe}" style="width: ${largura}%"></div>
    </div>`;
}

// ---------- Renderização: metas ----------

function renderizarMetas() {
  const metas = lerLista(STORAGE_CHAVES.metas)
    .slice()
    .sort((a, b) => a.prazo.localeCompare(b.prazo));

  listaMetas.innerHTML = "";
  metasVazio.hidden = metas.length > 0;

  metas.forEach((meta) => {
    const percentual = percentualMeta(meta);
    const nome = escaparHtml(meta.nome);
    const card = document.createElement("article");
    card.className = "card card--meta";
    card.innerHTML = `
      <div class="card__topo">
        <h4>${nome}</h4>
        <span class="card__tipo">até ${formatarDataBR(meta.prazo)}</span>
      </div>
      <p class="card__valor">
        ${formatarMoeda(meta.valorAtual)}
        <span class="card__meta-alvo">de ${formatarMoeda(meta.valorAlvo)}</span>
      </p>
      ${barraProgresso(percentual, percentual >= 100 ? "barra--concluida" : "", `Progresso de ${meta.nome}`)}
      <p class="card__detalhe">${percentual}% · ${situacaoMeta(meta)}</p>
      <div class="card__acoes">
        <button class="botao botao--aporte" data-acao="aportar-meta" data-id="${escaparHtml(meta.id)}" aria-label="Guardar dinheiro em ${nome}">+ Guardar</button>
        <button class="botao botao--editar" data-acao="editar-meta" data-id="${escaparHtml(meta.id)}" aria-label="Editar ${nome}">✎</button>
        <button class="botao botao--excluir" data-acao="excluir-meta" data-id="${escaparHtml(meta.id)}" aria-label="Excluir ${nome}">✕</button>
      </div>
    `;
    listaMetas.appendChild(card);
  });
}

// ---------- CRUD: metas ----------

function salvarMeta(evento) {
  evento.preventDefault();

  const dados = {
    nome: metaNome.value.trim(),
    valorAlvo: parseFloat(metaAlvo.value),
    valorAtual: parseFloat(metaAtual.value),
    prazo: metaPrazo.value,
  };

  if (!dados.nome || !(dados.valorAlvo > 0) || !(dados.valorAtual >= 0) || !dados.prazo) {
    alert("Preencha nome, valor alvo (maior que zero), valor atual e prazo.");
    return;
  }

  const metas = lerLista(STORAGE_CHAVES.metas);
  const anterior = metaEmEdicao ? metas.find((m) => m.id === metaEmEdicao) : null;
  const atualizadas = metaEmEdicao
    ? metas.map((m) => (m.id === metaEmEdicao ? { ...m, ...dados } : m))
    : [...metas, { id: gerarId(), ...dados }];

  salvarLista(STORAGE_CHAVES.metas, atualizadas);
  cancelarEdicaoMeta();
  renderizarMetas();

  // Só comemora a virada: a meta editada acabou de ser atingida
  if (anterior && !metaAtingida(anterior) && metaAtingida(dados)) {
    celebrarMeta({ ...anterior, ...dados });
  }
}

function iniciarEdicaoMeta(id) {
  const meta = lerLista(STORAGE_CHAVES.metas).find((m) => m.id === id);
  if (!meta) return;

  metaEmEdicao = id;
  metaNome.value = meta.nome;
  metaAlvo.value = meta.valorAlvo;
  metaAtual.value = meta.valorAtual;
  metaPrazo.value = meta.prazo;
  metaSalvar.textContent = "Salvar alterações";
  metaCancelar.hidden = false;
  metaNome.focus();
}

function cancelarEdicaoMeta() {
  metaEmEdicao = null;
  formMeta.reset();
  metaAtual.value = 0;
  metaSalvar.textContent = "Adicionar meta";
  metaCancelar.hidden = true;
}

function excluirMeta(id) {
  if (!confirm("Excluir esta meta?")) return;

  const metas = lerLista(STORAGE_CHAVES.metas).filter((m) => m.id !== id);
  salvarLista(STORAGE_CHAVES.metas, metas);
  if (id === metaEmEdicao) cancelarEdicaoMeta();
  renderizarMetas();
}

/** Aporte rápido: soma um valor ao "valor atual" da meta */
function aportarMeta(id) {
  const metas = lerLista(STORAGE_CHAVES.metas);
  const meta = metas.find((m) => m.id === id);
  if (!meta) return;

  const valor = pedirValor(`Quanto você guardou para "${meta.nome}"? (R$)`);
  if (valor === null) return;

  const atualizada = { ...meta, valorAtual: Math.round((meta.valorAtual + valor) * 100) / 100 };
  const atualizadas = metas.map((m) => (m.id === id ? atualizada : m));
  salvarLista(STORAGE_CHAVES.metas, atualizadas);
  renderizarMetas();

  if (!metaAtingida(meta) && metaAtingida(atualizada)) celebrarMeta(atualizada);
}

// ---------- Orçamento ----------

/** Preenche o select com as categorias de despesa */
function atualizarCategoriasOrcamento() {
  orcCategoria.innerHTML = "";
  CATEGORIAS.filter((c) => c.tipo === "despesa").forEach((c) => {
    const opcao = document.createElement("option");
    opcao.value = c.id;
    opcao.textContent = c.nome;
    orcCategoria.appendChild(opcao);
  });
}

function renderizarOrcamentos() {
  const mes = orcFiltroMes.value;
  const transacoes = lerLista(STORAGE_CHAVES.transacoes);
  const orcamentos = lerLista(STORAGE_CHAVES.orcamentos).filter((o) => o.mes === mes);

  listaOrcamentos.innerHTML = "";
  orcamentosVazio.hidden = orcamentos.length > 0;

  orcamentos
    .map((o) => {
      const gasto = gastoNaCategoria(o.categoriaId, mes, transacoes);
      return { ...o, gasto, percentual: Math.round((gasto / o.limite) * 100) };
    })
    .sort((a, b) => b.percentual - a.percentual) // mais perto de estourar primeiro
    .forEach((o) => {
      const nome = escaparHtml(nomeCategoria(o.categoriaId));
      const restante = o.limite - o.gasto;
      const rodape = restante >= 0
        ? `Restam ${formatarMoeda(restante)}`
        : `<span class="valor--despesa">Estourou ${formatarMoeda(-restante)}</span>`;

      const item = document.createElement("article");
      item.className = "orcamento";
      item.innerHTML = `
        <div class="orcamento__cabecalho">
          <strong>${nome}</strong>
          <span>${formatarMoeda(o.gasto)} de ${formatarMoeda(o.limite)}</span>
        </div>
        ${barraProgresso(o.percentual, classeBarraOrcamento(o.percentual), `Orçamento de ${nomeCategoria(o.categoriaId)}`)}
        <div class="orcamento__rodape card__detalhe">
          <span>${o.percentual}% usado · ${rodape}</span>
          <button class="botao botao--excluir" data-acao="excluir-orcamento" data-id="${escaparHtml(o.id)}" aria-label="Excluir orçamento de ${nome}">✕</button>
        </div>
      `;
      listaOrcamentos.appendChild(item);
    });
}

/** Define (ou substitui) o limite de uma categoria no mês */
function salvarOrcamento(evento) {
  evento.preventDefault();

  const dados = {
    categoriaId: orcCategoria.value,
    mes: orcMes.value,
    limite: parseFloat(orcLimite.value),
  };

  if (!dados.categoriaId || !dados.mes || !(dados.limite > 0)) {
    alert("Escolha a categoria, o mês e um limite maior que zero.");
    return;
  }

  const orcamentos = lerLista(STORAGE_CHAVES.orcamentos);
  const existente = orcamentos.find(
    (o) => o.categoriaId === dados.categoriaId && o.mes === dados.mes
  );
  const atualizados = existente
    ? orcamentos.map((o) => (o.id === existente.id ? { ...o, limite: dados.limite } : o))
    : [...orcamentos, { id: gerarId(), ...dados }];

  salvarLista(STORAGE_CHAVES.orcamentos, atualizados);

  orcLimite.value = "";
  orcFiltroMes.value = dados.mes; // mostra o mês que acabou de ser editado
  renderizarOrcamentos();
}

function excluirOrcamento(id) {
  if (!confirm("Excluir este orçamento?")) return;
  const orcamentos = lerLista(STORAGE_CHAVES.orcamentos).filter((o) => o.id !== id);
  salvarLista(STORAGE_CHAVES.orcamentos, orcamentos);
  renderizarOrcamentos();
}

// ---------- Eventos ----------
formMeta.addEventListener("submit", salvarMeta);
metaCancelar.addEventListener("click", cancelarEdicaoMeta);
formOrcamento.addEventListener("submit", salvarOrcamento);
orcFiltroMes.addEventListener("change", renderizarOrcamentos);

// Delegação: um listener cobre os botões das metas e dos orçamentos
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;

  const { acao, id } = botao.dataset;
  if (acao === "aportar-meta") aportarMeta(id);
  if (acao === "editar-meta") iniciarEdicaoMeta(id);
  if (acao === "excluir-meta") excluirMeta(id);
  if (acao === "excluir-orcamento") excluirOrcamento(id);
});

// ---------- Inicialização ----------
orcMes.value = mesAtualISO();
orcFiltroMes.value = mesAtualISO();
atualizarCategoriasOrcamento();
renderizarMetas();
renderizarOrcamentos();
