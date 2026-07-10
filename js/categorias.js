/* =========================================================
   categorias.js — categorias compartilhadas entre as telas
   (Fase 6: passarão a ser gerenciadas nas Configurações)
   ========================================================= */

const CATEGORIAS = [
  { id: "cat-alimentacao", nome: "Alimentação", tipo: "despesa" },
  { id: "cat-moradia",     nome: "Moradia",     tipo: "despesa" },
  { id: "cat-transporte",  nome: "Transporte",  tipo: "despesa" },
  { id: "cat-lazer",       nome: "Lazer",       tipo: "despesa" },
  { id: "cat-saude",       nome: "Saúde",       tipo: "despesa" },
  { id: "cat-outros-desp", nome: "Outros",      tipo: "despesa" },
  { id: "cat-salario",     nome: "Salário",     tipo: "receita" },
  { id: "cat-freela",      nome: "Freelance",   tipo: "receita" },
  { id: "cat-outros-rec",  nome: "Outros",      tipo: "receita" },
];

/** Retorna o nome de uma categoria pelo id */
function nomeCategoria(id) {
  const cat = CATEGORIAS.find((c) => c.id === id);
  return cat ? cat.nome : "—";
}
