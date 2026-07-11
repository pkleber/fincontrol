/* =========================================================
   categorias.js — categorias do app (Fase 6: dinâmicas)
   Na primeira execução, as categorias padrão são gravadas
   no localStorage; depois, a lista vem de lá e pode ser
   gerenciada na tela de Configurações.
   Requer: storage.js carregado antes.
   ========================================================= */

const CATEGORIAS_PADRAO = [
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

let CATEGORIAS = (function carregarCategorias() {
  const salvas = lerLista(STORAGE_CHAVES.categorias);
  if (salvas.length === 0) {
    salvarLista(STORAGE_CHAVES.categorias, CATEGORIAS_PADRAO);
    return [...CATEGORIAS_PADRAO];
  }
  return salvas;
})();

/** Retorna o nome de uma categoria pelo id */
function nomeCategoria(id) {
  const cat = CATEGORIAS.find((c) => c.id === id);
  return cat ? cat.nome : "—";
}
