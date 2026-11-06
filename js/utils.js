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

/**
 * Data de hoje no fuso LOCAL, formato "2026-07-08".
 * (toISOString() usa UTC: no Brasil, depois das 21h, já seria "amanhã".)
 */
function hojeISO() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

/** Mês atual no fuso local, formato "2026-07" */
function mesAtualISO() {
  return hojeISO().slice(0, 7);
}

/** Formata "2026-07-08" como "08/07/2026" */
function formatarDataBR(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

/**
 * Escapa texto do usuário antes de inseri-lo via innerHTML.
 * Sem isso, um nome como <img src=x onerror=...> executaria código.
 */
function escaparHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Converte um valor digitado pelo usuário em número.
 * Aceita "1234.56", "1234,56" e "1.234,56". Retorna NaN se inválido.
 */
function converterValor(texto) {
  const limpo = String(texto ?? "").trim().replace(/^R\$\s*/, "");
  const normalizado = limpo.includes(",")
    ? limpo.replaceAll(".", "").replace(",", ".")
    : limpo;
  return /^\d+(\.\d+)?$/.test(normalizado) ? parseFloat(normalizado) : NaN;
}

/** Pede um valor positivo via prompt. Retorna o número ou null se cancelado/inválido. */
function pedirValor(mensagem) {
  const resposta = prompt(mensagem);
  if (resposta === null) return null; // cancelou
  const valor = converterValor(resposta);
  if (isNaN(valor) || valor <= 0) {
    alert("Valor inválido. Use números, ex.: 150 ou 150,50.");
    return null;
  }
  return valor;
}
