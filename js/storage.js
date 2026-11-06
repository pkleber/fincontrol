/* =========================================================
   storage.js — camada de persistência (localStorage)
   Todas as leituras/escritas de dados passam por aqui.
   ========================================================= */

const STORAGE_CHAVES = {
  transacoes: "fincontrol.transacoes",
  categorias: "fincontrol.categorias",
  contas: "fincontrol.contas",
  cartoes: "fincontrol.cartoes",
  metas: "fincontrol.metas",
  orcamentos: "fincontrol.orcamentos",
  caixinhas: "fincontrol.caixinhas",
  config: "fincontrol.config", // objeto (tema, cdiAnual), não lista
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

/** Lê o objeto de configurações (retorna {} se não existir ou estiver corrompido) */
function lerConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(STORAGE_CHAVES.config));
    return config && typeof config === "object" && !Array.isArray(config) ? config : {};
  } catch {
    return {};
  }
}

/** Salva o objeto de configurações */
function salvarConfig(config) {
  localStorage.setItem(STORAGE_CHAVES.config, JSON.stringify(config));
}
