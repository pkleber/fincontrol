/* =========================================================
   tema.js — aplica o tema salvo ANTES da página renderizar
   (por isso é o único script incluído no <head>)
   Não depende do storage.js; usa o auth.js (carregado antes) para achar a conta.
   Expõe aplicarTema(tema) para a tela de Configurações.
   ========================================================= */

/** Aplica "claro" | "escuro" | "sistema" no <html data-tema> */
function aplicarTema(tema) {
  const escuro =
    tema === "escuro" ||
    (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const novo = escuro ? "escuro" : "claro";
  const mudou = document.documentElement.dataset.tema !== novo;
  document.documentElement.dataset.tema = novo;

  // Avisa quem desenha com cores fixas (gráficos) para se redesenhar
  if (mudou) document.dispatchEvent(new CustomEvent("fincontrol:tema", { detail: novo }));
}

/**
 * Tema salvo nas configurações da conta logada (padrão: claro).
 * Sem conta logada (tela de login), segue o sistema operacional.
 */
function temaSalvo() {
  const logado = typeof AUTH !== "undefined" && AUTH.usuarioAtual();
  if (!logado) return "sistema";
  try {
    const config = JSON.parse(localStorage.getItem(AUTH.chaveDados("config"))) || {};
    return config.tema || "claro";
  } catch {
    return "claro";
  }
}

aplicarTema(temaSalvo());

// No modo "sistema", acompanha a troca de tema do sistema operacional em tempo real
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (temaSalvo() === "sistema") aplicarTema("sistema");
});
