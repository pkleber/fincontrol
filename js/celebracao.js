/* =========================================================
   celebracao.js — mensagem de motivação ao atingir uma meta
   Requer: utils.js, storage.js. Chamado por metas.js.
   ========================================================= */

const MENSAGENS_MOTIVACAO = [
  "Cada real guardado te trouxe até aqui. Disciplina virou conquista!",
  "Objetivo cumprido! Seu eu do futuro agradece.",
  "Constância vence. Aproveite o ritmo e defina a próxima meta.",
  "Você provou que consegue. Agora é sonhar mais alto!",
  "Planejou, guardou e chegou lá. Isso é controle financeiro de verdade.",
];

/** true quando o valor guardado já cobre o valor alvo */
function metaAtingida(meta) {
  return Boolean(meta) && meta.valorAlvo > 0 && meta.valorAtual >= meta.valorAlvo;
}

/** Abre o diálogo de comemoração para a meta recém-atingida */
function celebrarMeta(meta) {
  const dialogo = document.getElementById("celebracao");
  if (!dialogo || typeof dialogo.showModal !== "function" || dialogo.open) return;

  const nome = normalizarNome(lerConfig().nome);
  const indice = Math.floor(Math.random() * MENSAGENS_MOTIVACAO.length);

  document.getElementById("celebracao-titulo").textContent =
    nome ? `Parabéns, ${nome}!` : "Parabéns!";
  document.getElementById("celebracao-meta").textContent =
    `Você atingiu a meta "${meta.nome}" com ${formatarMoeda(meta.valorAtual)} guardados.`;
  document.getElementById("celebracao-mensagem").textContent = MENSAGENS_MOTIVACAO[indice];

  dialogo.showModal();
}

document.addEventListener("DOMContentLoaded", () => {
  const dialogo = document.getElementById("celebracao");
  if (!dialogo) return;

  // Clique no fundo escurecido fecha
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });

  // "Criar nova meta": fecha e leva o foco ao formulário
  const botaoNova = document.getElementById("celebracao-nova");
  if (botaoNova) {
    botaoNova.addEventListener("click", () => {
      dialogo.close();
      const campo = document.getElementById("meta-nome");
      if (campo) {
        campo.scrollIntoView({ behavior: "smooth", block: "center" });
        campo.focus({ preventScroll: true });
      }
    });
  }
});
