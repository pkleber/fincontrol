/* =========================================================
   tema.js — aplica o tema salvo ANTES da página renderizar
   (por isso é o único script incluído no <head>)
   Não depende do storage.js: precisa ser autossuficiente.
   ========================================================= */
(function () {
  let tema = "claro";
  try {
    const config = JSON.parse(localStorage.getItem("fincontrol.config")) || {};
    tema = config.tema || "claro";
  } catch { /* mantém o padrão */ }

  const escuro =
    tema === "escuro" ||
    (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
})();
