/* =========================================================
   storage.js — camada de persistência (localStorage)
   Todas as leituras/escritas de dados passam por aqui.
   ========================================================= */

const STORAGE_CHAVES = {
  transacoes: "fincontrol.transacoes",
  categorias: "fincontrol.categorias",
  contas: "fincontrol.contas",
  cartoes: "fincontrol.cartoes",
};

/** Lê uma lista do localStorage (retorna [] se não existir) */
function lerLista(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave)) || [];
  } catch {
    return [];
  }
}

/** Salva uma lista no localStorage */
function salvarLista(chave, lista) {
  localStorage.setItem(chave, JSON.stringify(lista));
}
