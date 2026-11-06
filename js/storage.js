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

/**
 * Lê uma lista do localStorage.
 * Retorna [] se não existir, se o JSON estiver corrompido ou se o
 * valor salvo não for uma lista — assim nenhuma página quebra.
 */
function lerLista(chave) {
  try {
    const valor = JSON.parse(localStorage.getItem(chave));
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

/**
 * Grava no localStorage avisando o usuário se não couber (cota cheia).
 * Relança o erro para interromper quem chamou: o formulário não é
 * limpo e a tela não finge que salvou.
 */
function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
    console.error(`FinControl: falha ao salvar "${chave}"`, erro);
    alert(
      "Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado.\n" +
      "Exporte um backup em Configurações e libere espaço."
    );
    throw erro;
  }
}

/** Salva uma lista no localStorage */
function salvarLista(chave, lista) {
  gravar(chave, lista);
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
  gravar(STORAGE_CHAVES.config, config);
}
