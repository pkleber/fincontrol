/* =========================================================
   sidebar.js — botão de recolher/expandir a sidebar
   Incluído no <head> (como o tema.js) para aplicar o estado
   salvo ANTES da renderização e evitar o "pulo" do layout.
   Não depende do storage.js: precisa ser autossuficiente.
   ========================================================= */

const SIDEBAR_CHAVE = "fincontrol.sidebar";
const SIDEBAR_RECOLHIDA = "recolhida";

/* Ícones estáticos (constantes do código, nunca dados do usuário) */
const SIDEBAR_ICONES = {
  "index.html":
    '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  "transacoes.html": '<path d="M4 7h16l-4-4"/><path d="M20 17H4l4 4"/>',
  "contas.html": '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  "metas.html":
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  "investimentos.html": '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  "relatorios.html": '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M2 20h20"/>',
  "configuracoes.html":
    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};

const SETA_SVG = '<path d="M15 6l-6 6 6 6"/>';

function sidebarEstaRecolhida() {
  try {
    return localStorage.getItem(SIDEBAR_CHAVE) === SIDEBAR_RECOLHIDA;
  } catch {
    return false;
  }
}

function salvarEstadoSidebar(recolhida) {
  try {
    localStorage.setItem(SIDEBAR_CHAVE, recolhida ? SIDEBAR_RECOLHIDA : "expandida");
  } catch {
    // Sem storage (aba privada/bloqueado): o botão funciona só nesta página
  }
}

function aplicarEstadoSidebar(recolhida) {
  if (recolhida) {
    document.documentElement.dataset.sidebar = SIDEBAR_RECOLHIDA;
  } else {
    delete document.documentElement.dataset.sidebar;
  }
}

function criarSvg(conteudo, classe) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add(classe);
  svg.innerHTML = conteudo; // conteúdo é constante deste arquivo
  return svg;
}

/** Envolve o texto de cada link num <span> e coloca o ícone antes */
function adicionarIcones(nav) {
  nav.querySelectorAll("a").forEach((link) => {
    const pagina = link.getAttribute("href").split("/").pop();
    const texto = link.textContent.trim();

    const rotulo = document.createElement("span");
    rotulo.className = "sidebar__texto";
    rotulo.textContent = texto;

    link.textContent = "";
    if (SIDEBAR_ICONES[pagina]) link.append(criarSvg(SIDEBAR_ICONES[pagina], "sidebar__icone"));
    link.append(rotulo);
    link.title = texto; // dica ao passar o mouse quando recolhida
  });
}

function atualizarBotao(botao, recolhida) {
  botao.setAttribute("aria-expanded", String(!recolhida));
  botao.setAttribute("aria-label", recolhida ? "Expandir menu" : "Recolher menu");
  botao.title = recolhida ? "Expandir menu" : "Recolher menu";
}

function criarBotaoRecolher(sidebar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "sidebar__recolher";
  botao.append(criarSvg(SETA_SVG, "sidebar__seta"));
  atualizarBotao(botao, sidebarEstaRecolhida());

  botao.addEventListener("click", () => {
    const recolhida = document.documentElement.dataset.sidebar !== SIDEBAR_RECOLHIDA;
    aplicarEstadoSidebar(recolhida);
    salvarEstadoSidebar(recolhida);
    atualizarBotao(botao, recolhida);
  });

  sidebar.prepend(botao);
}

aplicarEstadoSidebar(sidebarEstaRecolhida());

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const nav = sidebar?.querySelector(".sidebar__nav");
  if (!sidebar || !nav) return;

  adicionarIcones(nav);
  criarBotaoRecolher(sidebar);
});
