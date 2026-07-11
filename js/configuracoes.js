/* =========================================================
   configuracoes.js — tema, CDI, categorias e backup (Fase 6)
   ========================================================= */

// ---------- Elementos ----------
const configTema = document.getElementById("config-tema");
const configCdiGeral = document.getElementById("config-cdi-geral");
const formCategoria = document.getElementById("form-categoria");
const catNome = document.getElementById("cat-nome");
const catTipo = document.getElementById("cat-tipo");
const listaCatDespesa = document.getElementById("lista-cat-despesa");
const listaCatReceita = document.getElementById("lista-cat-receita");
const botaoBackup = document.getElementById("botao-backup");
const inputImportar = document.getElementById("input-importar");
const botaoLimpar = document.getElementById("botao-limpar");

// ---------- Tema ----------

function carregarTema() {
  configTema.value = lerConfig().tema || "claro";
}

function salvarTema() {
  const config = lerConfig();
  config.tema = configTema.value;
  salvarConfig(config);

  // Reaplica na hora, sem precisar recarregar a página
  const escuro =
    config.tema === "escuro" ||
    (config.tema === "sistema" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
}

// ---------- CDI ----------

function carregarCdiGeral() {
  configCdiGeral.value = lerConfig().cdiAnual;
}

function salvarCdiGeral() {
  const valor = parseFloat(configCdiGeral.value);
  if (isNaN(valor) || valor < 0) return;

  const config = lerConfig();
  config.cdiAnual = valor;
  salvarConfig(config);
}

// ---------- Categorias ----------

function renderizarCategorias() {
  const categorias = lerLista(STORAGE_CHAVES.categorias);

  listaCatDespesa.innerHTML = "";
  listaCatReceita.innerHTML = "";

  categorias.forEach((cat) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span>${cat.nome}</span>
      <button class="botao botao--excluir" data-acao="excluir-categoria" data-id="${cat.id}"
              aria-label="Excluir categoria ${cat.nome}">✕</button>
    `;
    (cat.tipo === "despesa" ? listaCatDespesa : listaCatReceita).appendChild(item);
  });
}

function adicionarCategoria(evento) {
  evento.preventDefault();

  const categorias = lerLista(STORAGE_CHAVES.categorias);
  const nome = catNome.value.trim();

  const duplicada = categorias.some(
    (c) => c.tipo === catTipo.value && c.nome.toLowerCase() === nome.toLowerCase()
  );
  if (duplicada) {
    alert("Já existe uma categoria com esse nome para esse tipo.");
    return;
  }

  categorias.push({ id: gerarId(), nome, tipo: catTipo.value });
  salvarLista(STORAGE_CHAVES.categorias, categorias);
  formCategoria.reset();
  renderizarCategorias();
}

function excluirCategoria(id) {
  const transacoes = lerLista(STORAGE_CHAVES.transacoes);
  const vinculadas = transacoes.filter((t) => t.categoriaId === id).length;

  const mensagem = vinculadas > 0
    ? `${vinculadas} transação(ões) usam esta categoria e ficarão "sem categoria". Excluir mesmo assim?`
    : "Excluir esta categoria?";
  if (!confirm(mensagem)) return;

  // Desvincula as transações (não as apaga — histórico preservado)
  transacoes.forEach((t) => { if (t.categoriaId === id) t.categoriaId = null; });
  salvarLista(STORAGE_CHAVES.transacoes, transacoes);

  const orcamentos = lerLista(STORAGE_CHAVES.orcamentos).filter((o) => o.categoriaId !== id);
  salvarLista(STORAGE_CHAVES.orcamentos, orcamentos);

  const categorias = lerLista(STORAGE_CHAVES.categorias).filter((c) => c.id !== id);
  salvarLista(STORAGE_CHAVES.categorias, categorias);
  renderizarCategorias();
}

// ---------- Backup ----------

/** Exporta todos os dados do app em um único arquivo JSON */
function exportarBackup() {
  const backup = { app: "FinControl", versao: 1, geradoEm: new Date().toISOString() };

  Object.entries(STORAGE_CHAVES).forEach(([nome, chave]) => {
    const bruto = localStorage.getItem(chave);
    if (bruto !== null) backup[nome] = JSON.parse(bruto);
  });

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `fincontrol_backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Restaura um backup, substituindo os dados atuais */
function importarBackup(evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const backup = JSON.parse(leitor.result);

      if (backup.app !== "FinControl") {
        alert("Este arquivo não parece ser um backup do FinControl.");
        return;
      }

      if (!confirm("Importar este backup? Os dados atuais serão SUBSTITUÍDOS.")) return;

      Object.entries(STORAGE_CHAVES).forEach(([nome, chave]) => {
        if (backup[nome] !== undefined) {
          localStorage.setItem(chave, JSON.stringify(backup[nome]));
        }
      });

      alert("Backup restaurado com sucesso!");
      location.reload();
    } catch {
      alert("Arquivo inválido: não foi possível ler o JSON.");
    }
  };
  leitor.readAsText(arquivo);
  evento.target.value = ""; // permite importar o mesmo arquivo de novo
}

// ---------- Zona de perigo ----------

function limparTudo() {
  if (!confirm("Apagar TODOS os dados do FinControl? Esta ação não tem volta.")) return;

  const confirmacao = prompt('Para confirmar, digite APAGAR (em maiúsculas):');
  if (confirmacao !== "APAGAR") {
    alert("Ação cancelada.");
    return;
  }

  Object.values(STORAGE_CHAVES).forEach((chave) => localStorage.removeItem(chave));
  alert("Todos os dados foram apagados.");
  location.reload();
}

// ---------- Eventos ----------
configTema.addEventListener("change", salvarTema);
configCdiGeral.addEventListener("change", salvarCdiGeral);
formCategoria.addEventListener("submit", adicionarCategoria);
botaoBackup.addEventListener("click", exportarBackup);
inputImportar.addEventListener("change", importarBackup);
botaoLimpar.addEventListener("click", limparTudo);

document.addEventListener("click", (evento) => {
  const botao = evento.target.closest('[data-acao="excluir-categoria"]');
  if (botao) excluirCategoria(botao.dataset.id);
});

// ---------- Inicialização ----------
carregarTema();
carregarCdiGeral();
renderizarCategorias();
