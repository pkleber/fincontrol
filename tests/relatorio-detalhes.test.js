/* Testes do js/relatorio-detalhes.js — rodar com: node --test tests/
   Funções puras: carregadas num contexto isolado, sem DOM. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const CODIGO = fs.readFileSync(path.join(__dirname, "..", "js", "relatorio-detalhes.js"), "utf8");

function carregar() {
  const contexto = {};
  vm.createContext(contexto);
  vm.runInContext(`${CODIGO}\nglobalThis.D = { detalhesDoMes, variacaoPercentual, mesAnterior };`, contexto);
  return contexto.D;
}

const NOMES = { c1: "Alimentação", c2: "Moradia", c3: "Salário" };
const nomeDe = (id) => NOMES[id] ?? "—";

const TRANSACOES = [
  { id: "1", data: "2026-07-05", tipo: "receita", valor: 5000, categoriaId: "c3", descricao: "Salário" },
  { id: "2", data: "2026-07-10", tipo: "despesa", valor: 300, categoriaId: "c1", descricao: "Mercado" },
  { id: "3", data: "2026-07-02", tipo: "despesa", valor: 1500, categoriaId: "c2", descricao: "Aluguel" },
  { id: "4", data: "2026-07-20", tipo: "despesa", valor: 200, categoriaId: "c1", descricao: "Feira" },
  { id: "5", data: "2026-06-15", tipo: "despesa", valor: 999, categoriaId: "c1", descricao: "Outro mês" },
];

test("soma receitas, despesas e saldo só do mês pedido", () => {
  const { detalhesDoMes } = carregar();
  const d = detalhesDoMes(TRANSACOES, "2026-07", nomeDe);
  assert.equal(d.receitas, 5000);
  assert.equal(d.despesas, 2000);
  assert.equal(d.saldo, 3000);
  assert.equal(d.quantidade, 4);
});

test("agrupa despesas por categoria, da maior para a menor, com percentual", () => {
  const { detalhesDoMes } = carregar();
  const d = detalhesDoMes(TRANSACOES, "2026-07", nomeDe);
  // JSON: arrays criados dentro do vm têm outro protótipo (outro "realm")
  assert.deepEqual(
    JSON.parse(JSON.stringify(d.categoriasDespesa)),
    [{ nome: "Moradia", valor: 1500, percentual: 75 }, { nome: "Alimentação", valor: 500, percentual: 25 }],
  );
});

test("taxa de economia é o saldo sobre as receitas", () => {
  const { detalhesDoMes } = carregar();
  assert.equal(detalhesDoMes(TRANSACOES, "2026-07", nomeDe).taxaEconomia, 60);
});

test("taxa de economia é null quando não há receita", () => {
  const { detalhesDoMes } = carregar();
  assert.equal(detalhesDoMes(TRANSACOES, "2026-06", nomeDe).taxaEconomia, null);
});

test("lista as transações do mês por data e não altera a lista original", () => {
  const { detalhesDoMes } = carregar();
  const copia = JSON.stringify(TRANSACOES);
  const d = detalhesDoMes(TRANSACOES, "2026-07", nomeDe);
  assert.deepEqual(d.transacoes.map((t) => t.id), ["3", "1", "2", "4"]);
  assert.equal(JSON.stringify(TRANSACOES), copia);
});

test("mês sem transações retorna tudo zerado", () => {
  const { detalhesDoMes } = carregar();
  const d = detalhesDoMes(TRANSACOES, "2026-01", nomeDe);
  assert.equal(d.quantidade, 0);
  assert.equal(d.saldo, 0);
  assert.equal(d.categoriasDespesa.length, 0);
});

test("variação percentual entre meses", () => {
  const { variacaoPercentual } = carregar();
  assert.equal(variacaoPercentual(150, 100), 50);
  assert.equal(variacaoPercentual(50, 100), -50);
  assert.equal(variacaoPercentual(100, 0), null, "sem base de comparação");
});

test("mês anterior vira o ano em janeiro", () => {
  const { mesAnterior } = carregar();
  assert.equal(mesAnterior("2026-07"), "2026-06");
  assert.equal(mesAnterior("2026-01"), "2025-12");
});
