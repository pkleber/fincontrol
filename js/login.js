/* =========================================================
   login.js — abas, formulários e animações da tela de login
   Requer: auth.js (contas e sessão).
   ========================================================= */

const cartaoLogin = document.getElementById("cartao-login");
const abas = {
  entrar: document.getElementById("aba-entrar"),
  criar: document.getElementById("aba-criar"),
};
const paineis = {
  entrar: document.getElementById("painel-entrar"),
  criar: document.getElementById("painel-criar"),
};

/** Tempo para ver o check de sucesso antes de ir ao Dashboard */
const ATRASO_SUCESSO_MS = 1100;
/** Atualização do contador de bloqueio por tentativas */
const INTERVALO_CONTADOR_MS = 1000;

const menosMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reinicia uma animação CSS (remover + forçar reflow + adicionar) */
function animar(elemento, classe) {
  elemento.classList.remove(classe);
  void elemento.offsetWidth;
  elemento.classList.add(classe);
}

// ---------- Abas ----------

function mostrarAba(nome, { focar = false } = {}) {
  const atual = cartaoLogin.dataset.aba || "entrar";
  if (nome === atual) return;

  Object.entries(abas).forEach(([chave, aba]) => {
    const ativa = chave === nome;
    aba.setAttribute("aria-selected", String(ativa));
    aba.tabIndex = ativa ? 0 : -1;
    paineis[chave].hidden = !ativa;
  });
  cartaoLogin.dataset.aba = nome;

  const painel = paineis[nome];
  painel.classList.remove("entrando-direita", "entrando-esquerda");
  animar(painel, nome === "criar" ? "entrando-direita" : "entrando-esquerda");

  if (focar) abas[nome].focus();
  history.replaceState(null, "", nome === "criar" ? "#criar" : location.pathname);
}

Object.entries(abas).forEach(([nome, aba]) => {
  aba.addEventListener("click", () => mostrarAba(nome));
});

// Setas esquerda/direita trocam de aba (padrão WAI-ARIA para tablist)
document.querySelector(".abas").addEventListener("keydown", (evento) => {
  if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
  evento.preventDefault();
  mostrarAba(cartaoLogin.dataset.aba === "criar" ? "entrar" : "criar", { focar: true });
});

document.querySelectorAll("[data-ir]").forEach((botao) => {
  botao.addEventListener("click", () => mostrarAba(botao.dataset.ir, { focar: true }));
});

// ---------- Mostrar/ocultar senha ----------

document.querySelectorAll("[data-alternar]").forEach((botao) => {
  botao.addEventListener("click", () => {
    const campo = document.getElementById(botao.dataset.alternar);
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    botao.setAttribute("aria-pressed", String(mostrar));
    botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  });
});

// ---------- Força da senha ----------

const TEXTOS_FORCA = [
  "Use letras, números e símbolos",
  "Fraca — capriche mais um pouco",
  "Razoável",
  "Boa",
  "Forte! 💪",
];

/** 0 a 4: comprimento mínimo, comprimento bom, maiúsc./minúsc., números e símbolos */
function nivelSenha(senha) {
  if (!senha) return 0;
  if (senha.length < AUTH.SENHA_MIN) return 1;
  const criterios = [
    senha.length >= 12,
    /[a-z]/.test(senha) && /[A-Z]/.test(senha),
    /\d/.test(senha),
    /[^A-Za-z0-9]/.test(senha),
  ].filter(Boolean).length;
  return Math.min(4, 1 + criterios);
}

const campoSenhaNova = document.getElementById("criar-senha");
const forca = document.querySelector(".forca");
campoSenhaNova.addEventListener("input", () => {
  const nivel = nivelSenha(campoSenhaNova.value);
  forca.dataset.nivel = String(nivel);
  document.getElementById("forca-texto").textContent = TEXTOS_FORCA[nivel];
});

// ---------- Envio ----------

function mostrarErro(form, mensagem, campo) {
  form.querySelector(".mensagem-login").textContent = mensagem;
  form.querySelectorAll("input").forEach((i) => i.removeAttribute("aria-invalid"));
  if (campo) {
    campo.setAttribute("aria-invalid", "true");
    campo.focus();
  }
  animar(cartaoLogin, "tremer");
}

function definirCarregando(form, carregando) {
  const botao = form.querySelector(".botao-login");
  botao.classList.toggle("carregando", carregando);
  botao.disabled = carregando;
  botao.setAttribute("aria-busy", String(carregando));
}

/** Check animado e, em seguida, o Dashboard (que abre as boas-vindas) */
function concluirLogin(usuario) {
  document.getElementById("sucesso-texto").textContent = `Tudo certo, ${usuario.nome}!`;
  cartaoLogin.classList.add("sucesso");
  const atraso = menosMovimento() ? 0 : ATRASO_SUCESSO_MS;
  setTimeout(() => location.replace(AUTH.URL_APP), atraso);
}

/** Campo mais provável de causar o erro, para focar e destacar */
function campoDoErro(form, mensagem) {
  if (/e-mail/i.test(mensagem) && !/senha/i.test(mensagem)) return form.querySelector('[type="email"]');
  if (/senha/i.test(mensagem) && !/e-mail/i.test(mensagem)) return form.querySelector('[name="senha"]');
  if (/chamar/i.test(mensagem)) return form.querySelector('[name="nome"]');
  return null;
}

async function enviar(form, acao) {
  form.querySelector(".mensagem-login").textContent = "";
  definirCarregando(form, true);
  try {
    const usuario = await acao();
    concluirLogin(usuario);
  } catch (erro) {
    definirCarregando(form, false);
    const mensagem = erro instanceof Error ? erro.message : "Algo deu errado. Tente de novo.";
    mostrarErro(form, mensagem, campoDoErro(form, mensagem));
    if (form === paineis.entrar) {
      form.querySelector('[name="senha"]').value = "";
      iniciarContadorBloqueio();
    }
  }
}

paineis.entrar.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const email = document.getElementById("entrar-email");
  const senha = document.getElementById("entrar-senha");
  if (!email.value.trim()) return mostrarErro(paineis.entrar, "Informe seu e-mail.", email);
  if (!senha.value) return mostrarErro(paineis.entrar, "Informe sua senha.", senha);

  enviar(paineis.entrar, () => AUTH.entrar({
    email: email.value,
    senha: senha.value,
    lembrar: document.getElementById("entrar-lembrar").checked,
  }));
});

paineis.criar.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const dados = {
    nome: document.getElementById("criar-nome").value,
    email: document.getElementById("criar-email").value,
    senha: campoSenhaNova.value,
    lembrar: document.getElementById("criar-lembrar").checked,
  };

  const problemas = AUTH.validarCadastro(dados);
  if (problemas.length > 0) {
    return mostrarErro(paineis.criar, problemas[0], campoDoErro(paineis.criar, problemas[0]));
  }

  enviar(paineis.criar, () => AUTH.criarConta(dados));
});

// ---------- Bloqueio por tentativas: contador regressivo ----------

let contadorBloqueio = null;

function iniciarContadorBloqueio() {
  if (contadorBloqueio || AUTH.tempoDeBloqueio() === 0) return;
  const mensagem = document.getElementById("entrar-mensagem");
  const botao = paineis.entrar.querySelector(".botao-login");

  const atualizar = () => {
    const restante = Math.ceil(AUTH.tempoDeBloqueio() / 1000);
    if (restante <= 0) {
      clearInterval(contadorBloqueio);
      contadorBloqueio = null;
      botao.disabled = false;
      mensagem.textContent = "";
      return;
    }
    botao.disabled = true;
    mensagem.textContent = `Muitas tentativas erradas. Tente de novo em ${restante}s.`;
  };

  atualizar();
  contadorBloqueio = setInterval(atualizar, INTERVALO_CONTADOR_MS);
}

// ---------- Início ----------

if (location.hash === "#criar") mostrarAba("criar");
iniciarContadorBloqueio();
