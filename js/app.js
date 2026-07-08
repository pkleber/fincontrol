/* =========================================================
   app.js — inicialização do Dashboard
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Exibe o mês atual no cabeçalho
  const mesEl = document.getElementById("mes-atual");
  if (mesEl) mesEl.textContent = mesAtualExtenso();

  // TODO (Fase 1): calcular receitas, despesas e saldo do mês
  // a partir das transações salvas no localStorage.
});
