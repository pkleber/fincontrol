/* =========================================================
   utils.js — funções auxiliares reutilizáveis
   ========================================================= */

/** Formata um número como moeda brasileira. Ex.: 1234.5 -> "R$ 1.234,50" */
function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Retorna o mês/ano atual por extenso. Ex.: "julho de 2026" */
function mesAtualExtenso() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Gera um id único simples para registros */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
