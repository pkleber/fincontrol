/* =========================================================
   storage.js — camada de persistência (localStorage)
   Todas as leituras/escritas de dados passam por aqui.
   ========================================================= */

// Cada conta tem suas próprias chaves (ex.: "fincontrol.u.<id>.transacoes").
// O id vem da sessão aberta pelo auth.js, carregado antes de tudo.
const STORAGE_CHAVES = Object.freeze({
  transacoes: AUTH.chaveDados("transacoes"),
  categorias: AUTH.chaveDados("categorias"),
  contas: AUTH.chaveDados("contas"),
  cartoes: AUTH.chaveDados("cartoes"),
  metas: AUTH.chaveDados("metas"),
  orcamentos: AUTH.chaveDados("orcamentos"),
  caixinhas: AUTH.chaveDados("caixinhas"),
  config: AUTH.chaveDados("config"), // objeto (tema, cdiAnual, nome), não lista
});

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
