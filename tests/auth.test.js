/* Testes do js/auth.js — rodar com: node --test tests/
   Carrega o script num contexto isolado com localStorage/sessionStorage
   falsos, simulando uma página do app ou a página de login. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const CODIGO = fs.readFileSync(path.join(__dirname, "..", "js", "auth.js"), "utf8");

function criarStorage(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
    get tamanho() { return dados.size; },
    chaves: () => [...dados.keys()],
  };
}

/** Carrega o auth.js como numa página. Reaproveita o localStorage entre "páginas". */
function carregar({ local = criarStorage(), sessao = criarStorage(), publica = false, url = "file:///app/index.html" } = {}) {
  const redirecionamentos = [];
  const html = { hidden: false, hasAttribute: (a) => a === "data-publica" && publica };
  const contexto = {
    localStorage: local,
    sessionStorage: sessao,
    crypto: globalThis.crypto,
    TextEncoder, URL, btoa, atob, Uint8Array, Date, Math, JSON, console,
    // Como nas páginas reais: pages/*.html usam "../js/auth.js"
    document: { currentScript: { src: new URL(url.includes("/pages/") ? "../js/auth.js" : "js/auth.js", url).href }, documentElement: html },
    location: { href: url, replace: (u) => redirecionamentos.push(u) },
  };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext(`${CODIGO}\nglobalThis.AUTH = AUTH;`, contexto);
  return { AUTH: contexto.AUTH, local, sessao, redirecionamentos, html };
}

const CONTA = { nome: "Ana", email: "Ana@Exemplo.com ", senha: "senha-forte-123" };

test("página do app sem sessão é escondida e redireciona para o login", () => {
  const { redirecionamentos, html } = carregar();
  assert.equal(html.hidden, true);
  assert.deepEqual(redirecionamentos, ["file:///app/login.html"]);
});

test("redirecionamento funciona também a partir de pages/", () => {
  const { redirecionamentos } = carregar({ url: "file:///app/pages/metas.html" });
  assert.deepEqual(redirecionamentos, ["file:///app/login.html"]);
});

test("página de login sem sessão não redireciona", () => {
  const { redirecionamentos } = carregar({ publica: true });
  assert.deepEqual(redirecionamentos, []);
});

test("criar conta guarda só hash e sal, nunca a senha", async () => {
  const { AUTH, local } = carregar({ publica: true });
  const usuario = await AUTH.criarConta(CONTA);

  assert.equal(usuario.email, "ana@exemplo.com");
  assert.equal(usuario.hash, undefined, "dados públicos não expõem o hash");
  const bruto = local.getItem("fincontrol.usuarios");
  assert.ok(!bruto.includes(CONTA.senha), "senha em texto puro no storage");
  const [salvo] = JSON.parse(bruto);
  assert.equal(salvo.iteracoes, 600000);
  assert.match(salvo.sal, /^[A-Za-z0-9+/]+=*$/);
});

test("contas diferentes recebem sais e hashes diferentes", async () => {
  const { AUTH, local } = carregar({ publica: true });
  await AUTH.criarConta({ ...CONTA, email: "a@x.com" });
  await AUTH.criarConta({ ...CONTA, email: "b@x.com" });
  const [a, b] = JSON.parse(local.getItem("fincontrol.usuarios"));
  assert.notEqual(a.sal, b.sal);
  assert.notEqual(a.hash, b.hash);
});

test("cadastro inválido é recusado com mensagem clara", async () => {
  const { AUTH } = carregar({ publica: true });
  await assert.rejects(AUTH.criarConta({ ...CONTA, senha: "curta" }), /pelo menos 8/);
  await assert.rejects(AUTH.criarConta({ ...CONTA, email: "sem-arroba" }), /e-mail válido/);
  await assert.rejects(AUTH.criarConta({ ...CONTA, nome: "   " }), /chamar/);
});

test("e-mail duplicado (ignorando maiúsculas) é recusado", async () => {
  const { AUTH } = carregar({ publica: true });
  await AUTH.criarConta(CONTA);
  await assert.rejects(AUTH.criarConta({ ...CONTA, email: "ANA@exemplo.com" }), /Já existe/);
});

test("login com senha certa abre sessão; com senha errada, mensagem genérica", async () => {
  const local = criarStorage();
  await carregar({ local, publica: true }).AUTH.criarConta(CONTA);

  const pagina = carregar({ local, publica: true });
  await assert.rejects(pagina.AUTH.entrar({ email: CONTA.email, senha: "errada!!" }), /E-mail ou senha incorretos/);
  await assert.rejects(pagina.AUTH.entrar({ email: "nao@existe.com", senha: "x" }), /E-mail ou senha incorretos/);

  const usuario = await pagina.AUTH.entrar({ email: " ANA@exemplo.com", senha: CONTA.senha });
  assert.equal(usuario.nome, "Ana");
  assert.equal(pagina.AUTH.usuarioAtual().email, "ana@exemplo.com");
});

test("depois de 5 erros o login fica bloqueado, mesmo com a senha certa", async () => {
  const local = criarStorage();
  const { AUTH } = carregar({ local, publica: true });
  await AUTH.criarConta(CONTA);
  for (let i = 0; i < 5; i++) {
    await assert.rejects(AUTH.entrar({ email: CONTA.email, senha: "errada" }));
  }
  assert.ok(AUTH.tempoDeBloqueio() > 0);
  await assert.rejects(AUTH.entrar({ email: CONTA.email, senha: CONTA.senha }), /Muitas tentativas/);
});

test("sessão sem 'manter conectado' fica só na aba (sessionStorage)", async () => {
  const { AUTH, local, sessao } = carregar({ publica: true });
  await AUTH.criarConta(CONTA);
  assert.ok(sessao.getItem("fincontrol.sessao"));
  assert.equal(local.getItem("fincontrol.sessao"), null);
});

test("'manter conectado' guarda a sessão no localStorage", async () => {
  const { AUTH, local, sessao } = carregar({ publica: true });
  await AUTH.criarConta({ ...CONTA, lembrar: true });
  assert.ok(local.getItem("fincontrol.sessao"));
  assert.equal(sessao.getItem("fincontrol.sessao"), null);
});

test("sessão expirada não vale e manda de volta ao login", async () => {
  const local = criarStorage();
  const sessao = criarStorage();
  await carregar({ local, sessao, publica: true }).AUTH.criarConta(CONTA);
  const s = JSON.parse(sessao.getItem("fincontrol.sessao"));
  sessao.setItem("fincontrol.sessao", JSON.stringify({ ...s, expiraEm: Date.now() - 1 }));

  const { AUTH, redirecionamentos } = carregar({ local, sessao });
  assert.equal(AUTH.usuarioAtual(), null);
  assert.equal(redirecionamentos.length, 1);
});

test("sessão apontando para conta inexistente (forjada) não vale", () => {
  const sessao = criarStorage({
    "fincontrol.sessao": JSON.stringify({ usuarioId: "forjado", expiraEm: Date.now() + 1e6 }),
  });
  const { AUTH, redirecionamentos } = carregar({ sessao });
  assert.equal(AUTH.usuarioAtual(), null);
  assert.equal(redirecionamentos.length, 1);
});

test("com sessão, página do app abre e usa chaves só da conta", async () => {
  const local = criarStorage();
  const sessao = criarStorage();
  const usuario = await carregar({ local, sessao, publica: true }).AUTH.criarConta(CONTA);

  const { AUTH, redirecionamentos, html } = carregar({ local, sessao });
  assert.deepEqual(redirecionamentos, []);
  assert.equal(html.hidden, false);
  assert.equal(AUTH.chaveDados("transacoes"), `fincontrol.u.${usuario.id}.transacoes`);
  assert.equal(JSON.parse(local.getItem(AUTH.chaveDados("config"))).nome, "Ana");
});

test("login aberto na página de login leva direto ao app", async () => {
  const local = criarStorage();
  const sessao = criarStorage();
  await carregar({ local, sessao, publica: true }).AUTH.criarConta(CONTA);
  const { redirecionamentos } = carregar({ local, sessao, publica: true });
  assert.deepEqual(redirecionamentos, ["file:///app/index.html"]);
});

test("primeira conta herda os dados de antes do login; a segunda começa vazia", async () => {
  const transacoes = JSON.stringify([{ id: "t1", descricao: "Mercado" }]);
  const local = criarStorage({
    "fincontrol.transacoes": transacoes,
    "fincontrol.config": JSON.stringify({ tema: "escuro", nome: "Aninha" }),
  });
  const { AUTH } = carregar({ local, publica: true });
  const primeira = await AUTH.criarConta(CONTA);

  assert.equal(local.getItem("fincontrol.transacoes"), null, "chave antiga removida");
  assert.equal(local.getItem(`fincontrol.u.${primeira.id}.transacoes`), transacoes);
  const config = JSON.parse(local.getItem(`fincontrol.u.${primeira.id}.config`));
  assert.deepEqual(config, { tema: "escuro", nome: "Aninha" }, "nome já salvo é mantido");

  const segunda = await AUTH.criarConta({ ...CONTA, email: "bia@x.com", nome: "Bia" });
  assert.equal(local.getItem(`fincontrol.u.${segunda.id}.transacoes`), null);
});

test("sair encerra a sessão e volta ao login", async () => {
  const local = criarStorage();
  const sessao = criarStorage();
  await carregar({ local, sessao, publica: true }).AUTH.criarConta({ ...CONTA, lembrar: true });

  const pagina = carregar({ local, sessao });
  pagina.AUTH.sair();
  assert.equal(local.getItem("fincontrol.sessao"), null);
  assert.equal(sessao.getItem("fincontrol.sessao"), null);
  assert.deepEqual(pagina.redirecionamentos, ["file:///app/login.html"]);
});

test("aviso de boas-vindas é consumido uma única vez após o login", async () => {
  const { AUTH } = carregar({ publica: true });
  await AUTH.criarConta(CONTA);
  assert.equal(AUTH.consumirBoasVindasPendente(), true);
  assert.equal(AUTH.consumirBoasVindasPendente(), false);
});

test("registros de conta adulterados no storage são ignorados", () => {
  const local = criarStorage({
    "fincontrol.usuarios": JSON.stringify([{ id: '"><img src=x onerror=alert(1)>', email: "a@b.co" }]),
  });
  const sessao = criarStorage({
    "fincontrol.sessao": JSON.stringify({ usuarioId: '"><img src=x onerror=alert(1)>', expiraEm: Date.now() + 1e6 }),
  });
  const { AUTH } = carregar({ local, sessao });
  assert.equal(AUTH.usuarioAtual(), null);
});
