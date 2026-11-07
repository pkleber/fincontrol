/* =========================================================
   auth.js — contas locais, sessão e proteção das páginas
   Primeiro script de toda página (no <head>): sem sessão válida,
   as páginas do app redirecionam para login.html antes de renderizar.

   Segurança (app 100% no navegador, sem servidor):
   - a senha nunca é salva: guardamos só um hash PBKDF2-SHA256
     (600 mil iterações, sal aleatório de 16 bytes por conta);
   - os dados de cada conta ficam em chaves próprias
     ("fincontrol.u.<id>.transacoes"), então contas não se misturam;
   - tentativas erradas seguidas bloqueiam o login por um tempo.
   Limite honesto: quem tem acesso ao navegador/DevTools consegue ler
   o localStorage. O login separa perfis, não criptografa os dados.
   ========================================================= */

const AUTH = (() => {
  const CHAVE_USUARIOS = "fincontrol.usuarios";
  const CHAVE_SESSAO = "fincontrol.sessao";
  const CHAVE_TENTATIVAS = "fincontrol.tentativas";
  const CHAVE_BOAS_VINDAS = "fincontrol.boasVindasPendente"; // sessionStorage

  /** Partes dos dados que pertencem a cada conta (sufixo da chave) */
  const NOMES_DADOS = [
    "transacoes", "categorias", "contas", "cartoes",
    "metas", "orcamentos", "caixinhas", "config",
  ];

  const ITERACOES_PBKDF2 = 600000; // recomendação OWASP para PBKDF2-SHA256
  const BYTES_SAL = 16;
  const BITS_HASH = 256;

  const SENHA_MIN = 8;
  const SENHA_MAX = 128;
  const EMAIL_MAX = 254;
  const NOME_MAX = 40;

  const HORA_MS = 60 * 60 * 1000;
  const SESSAO_ABA_MS = 12 * HORA_MS;           // sem "manter conectado"
  const SESSAO_LEMBRAR_MS = 30 * 24 * HORA_MS;  // com "manter conectado"

  const FALHAS_ANTES_DO_BLOQUEIO = 5;
  const BLOQUEIO_BASE_MS = 30 * 1000;           // 30s, dobrando a cada falha extra
  const BLOQUEIO_MAX_MS = 15 * 60 * 1000;       // teto de 15 min

  const RE_ID = /^[A-Za-z0-9_-]{1,64}$/;
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const RE_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

  // ---------- Utilidades ----------

  function lerJSON(armazenamento, chave) {
    try {
      return JSON.parse(armazenamento.getItem(chave));
    } catch {
      return null;
    }
  }

  const paraBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
  const deBase64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

  function normalizarEmail(texto) {
    return String(texto ?? "").trim().toLowerCase();
  }

  function normalizarNomeConta(texto) {
    return String(texto ?? "").trim().replace(/\s+/g, " ").slice(0, NOME_MAX);
  }

  /** Comparação em tempo constante (não revela onde os hashes diferem) */
  function iguaisTempoConstante(a, b) {
    if (a.length !== b.length) return false;
    let diferenca = 0;
    for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diferenca === 0;
  }

  function cryptoDisponivel() {
    return Boolean(globalThis.crypto && crypto.subtle && crypto.getRandomValues);
  }

  async function derivarHash(senha, sal, iteracoes) {
    const material = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteracoes },
      material, BITS_HASH
    );
    return paraBase64(new Uint8Array(bits));
  }

  /** Id aleatório só com caracteres seguros para chaves e atributos */
  function novoId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ---------- Contas ----------

  function usuarioValido(u) {
    return Boolean(u) && typeof u === "object" &&
      typeof u.id === "string" && RE_ID.test(u.id) &&
      typeof u.email === "string" && RE_EMAIL.test(u.email) &&
      typeof u.nome === "string" && u.nome.length <= NOME_MAX &&
      typeof u.sal === "string" && RE_BASE64.test(u.sal) &&
      typeof u.hash === "string" && RE_BASE64.test(u.hash) &&
      Number.isInteger(u.iteracoes) && u.iteracoes >= 100000;
  }

  /** Lista de contas válidas (registros adulterados são ignorados) */
  function lerUsuarios() {
    const lista = lerJSON(localStorage, CHAVE_USUARIOS);
    return Array.isArray(lista) ? lista.filter(usuarioValido) : [];
  }

  /** Conta sem os campos sensíveis, para uso nas telas */
  const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email });

  /** Problemas do cadastro (vazio = ok). Mensagens prontas para a tela. */
  function validarCadastro({ nome, email, senha }) {
    const problemas = [];
    if (!normalizarNomeConta(nome)) problemas.push("Informe como podemos te chamar.");
    const emailLimpo = normalizarEmail(email);
    if (!RE_EMAIL.test(emailLimpo) || emailLimpo.length > EMAIL_MAX) {
      problemas.push("Informe um e-mail válido.");
    }
    if (typeof senha !== "string" || senha.length < SENHA_MIN) {
      problemas.push(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    } else if (senha.length > SENHA_MAX) {
      problemas.push(`A senha pode ter no máximo ${SENHA_MAX} caracteres.`);
    }
    return problemas;
  }

  /** Chave de uma parte dos dados de uma conta */
  const chaveDaConta = (id, nome) => `fincontrol.u.${id}.${nome}`;

  /**
   * Primeira conta do navegador herda os dados de antes do login
   * (chaves "fincontrol.transacoes" etc.). Copia tudo e só depois
   * apaga as antigas; se faltar espaço, desfaz a cópia.
   */
  function migrarDadosAntigos(id) {
    const antigos = NOMES_DADOS
      .map((nome) => [nome, localStorage.getItem(`fincontrol.${nome}`)])
      .filter(([, bruto]) => bruto !== null);
    if (antigos.length === 0) return;

    try {
      antigos.forEach(([nome, bruto]) => localStorage.setItem(chaveDaConta(id, nome), bruto));
    } catch (erro) {
      antigos.forEach(([nome]) => localStorage.removeItem(chaveDaConta(id, nome)));
      throw erro;
    }
    antigos.forEach(([nome]) => localStorage.removeItem(`fincontrol.${nome}`));
  }

  /** Nome da conta vira o nome da saudação (sem apagar o resto da config) */
  function gravarNomeNaConfig(id, nome) {
    const chave = chaveDaConta(id, "config");
    const atual = lerJSON(localStorage, chave);
    const config = atual && typeof atual === "object" && !Array.isArray(atual) ? atual : {};
    localStorage.setItem(chave, JSON.stringify({ ...config, nome: config.nome || nome }));
  }

  async function criarConta({ nome, email, senha, lembrar = false }) {
    if (!cryptoDisponivel()) throw new Error("Seu navegador não suporta login seguro.");
    const problemas = validarCadastro({ nome, email, senha });
    if (problemas.length > 0) throw new Error(problemas[0]);

    const usuarios = lerUsuarios();
    const emailLimpo = normalizarEmail(email);
    if (usuarios.some((u) => u.email === emailLimpo)) {
      throw new Error("Já existe uma conta com esse e-mail neste navegador.");
    }

    const sal = crypto.getRandomValues(new Uint8Array(BYTES_SAL));
    const usuario = {
      id: novoId(),
      nome: normalizarNomeConta(nome),
      email: emailLimpo,
      sal: paraBase64(sal),
      hash: await derivarHash(senha, sal, ITERACOES_PBKDF2),
      iteracoes: ITERACOES_PBKDF2,
      criadoEm: new Date().toISOString(),
    };

    // Conta primeiro: se a migração falhar depois, os dados antigos continuam
    // intactos (a migração só apaga o original após copiar tudo)
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify([...usuarios, usuario]));
    if (usuarios.length === 0) {
      try {
        migrarDadosAntigos(usuario.id);
      } catch (erro) {
        console.error("FinControl: não foi possível mover os dados antigos para a conta", erro);
      }
    }
    gravarNomeNaConfig(usuario.id, usuario.nome);
    iniciarSessao(usuario.id, lembrar);
    return publico(usuario);
  }

  // ---------- Bloqueio por tentativas erradas ----------

  function lerTentativas() {
    const t = lerJSON(localStorage, CHAVE_TENTATIVAS);
    return t && Number.isInteger(t.falhas) && Number.isFinite(t.bloqueadoAte)
      ? t
      : { falhas: 0, bloqueadoAte: 0 };
  }

  /** Milissegundos que ainda faltam de bloqueio (0 = liberado) */
  function tempoDeBloqueio(agora = Date.now()) {
    return Math.max(0, lerTentativas().bloqueadoAte - agora);
  }

  function registrarFalha() {
    const { falhas } = lerTentativas();
    const total = falhas + 1;
    const excesso = total - FALHAS_ANTES_DO_BLOQUEIO;
    const espera = excesso >= 0 ? Math.min(BLOQUEIO_MAX_MS, BLOQUEIO_BASE_MS * 2 ** excesso) : 0;
    try {
      localStorage.setItem(CHAVE_TENTATIVAS, JSON.stringify({
        falhas: total, bloqueadoAte: espera ? Date.now() + espera : 0,
      }));
    } catch {
      // sem espaço: o PBKDF2 lento continua freando tentativas
    }
  }

  // ---------- Login e sessão ----------

  // Hash usado quando o e-mail não existe: o tempo de resposta fica igual,
  // então não dá para descobrir quais e-mails têm conta.
  const SAL_FICTICIO = new Uint8Array(BYTES_SAL);

  async function entrar({ email, senha, lembrar = false }) {
    if (!cryptoDisponivel()) throw new Error("Seu navegador não suporta login seguro.");

    const espera = tempoDeBloqueio();
    if (espera > 0) {
      throw new Error(`Muitas tentativas. Tente de novo em ${Math.ceil(espera / 1000)}s.`);
    }

    const usuario = lerUsuarios().find((u) => u.email === normalizarEmail(email));
    const senhaTexto = String(senha ?? "").slice(0, SENHA_MAX);
    const hash = usuario
      ? await derivarHash(senhaTexto, deBase64(usuario.sal), usuario.iteracoes)
      : await derivarHash(senhaTexto, SAL_FICTICIO, ITERACOES_PBKDF2);

    if (!usuario || !iguaisTempoConstante(hash, usuario.hash)) {
      registrarFalha();
      throw new Error("E-mail ou senha incorretos.");
    }

    localStorage.removeItem(CHAVE_TENTATIVAS);
    iniciarSessao(usuario.id, lembrar);
    return publico(usuario);
  }

  function iniciarSessao(usuarioId, lembrar) {
    const sessao = {
      usuarioId,
      expiraEm: Date.now() + (lembrar ? SESSAO_LEMBRAR_MS : SESSAO_ABA_MS),
    };
    encerrarSessao();
    // "Manter conectado" sobrevive ao fechar o navegador; sem ele, só esta aba
    (lembrar ? localStorage : sessionStorage).setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    sessionStorage.setItem(CHAVE_BOAS_VINDAS, "1");
  }

  function encerrarSessao() {
    try {
      sessionStorage.removeItem(CHAVE_SESSAO);
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      // storage bloqueado: não há sessão para encerrar
    }
  }

  /** Conta logada (sem hash/sal) ou null se não houver sessão válida */
  function usuarioAtual() {
    let sessao = null;
    try {
      sessao = lerJSON(sessionStorage, CHAVE_SESSAO) || lerJSON(localStorage, CHAVE_SESSAO);
    } catch {
      return null; // storage bloqueado
    }
    if (!sessao || typeof sessao.usuarioId !== "string" || !(sessao.expiraEm > Date.now())) {
      return null;
    }
    const usuario = lerUsuarios().find((u) => u.id === sessao.usuarioId);
    return usuario ? publico(usuario) : null;
  }

  /** Lê e consome o aviso "acabou de entrar" (mostra as boas-vindas uma vez) */
  function consumirBoasVindasPendente() {
    try {
      const pendente = sessionStorage.getItem(CHAVE_BOAS_VINDAS) === "1";
      sessionStorage.removeItem(CHAVE_BOAS_VINDAS);
      return pendente;
    } catch {
      return false;
    }
  }

  // ---------- Proteção das páginas ----------

  // Endereços calculados a partir deste arquivo (js/auth.js): funcionam
  // tanto na raiz quanto em pages/
  const urlBase = document.currentScript ? document.currentScript.src : location.href;
  const URL_LOGIN = new URL("../login.html", urlBase).href;
  const URL_APP = new URL("../index.html", urlBase).href;

  const atual = usuarioAtual();
  const paginaPublica = document.documentElement.hasAttribute("data-publica");

  if (!paginaPublica && !atual) {
    encerrarSessao(); // limpa sessão expirada
    document.documentElement.hidden = true; // não mostra dados nem por um instante
    location.replace(URL_LOGIN);
  } else if (paginaPublica && atual) {
    location.replace(URL_APP);
  }

  /** Chave do localStorage para uma parte dos dados da conta logada */
  function chaveDados(nome) {
    // Sem sessão a página já está indo para o login: usa um espaço vazio
    return atual ? chaveDaConta(atual.id, nome) : `fincontrol.semsessao.${nome}`;
  }

  function sair() {
    encerrarSessao();
    location.replace(URL_LOGIN);
  }

  return Object.freeze({
    SENHA_MIN, NOME_MAX, EMAIL_MAX, URL_APP,
    criarConta, entrar, sair, usuarioAtual, chaveDados,
    validarCadastro, tempoDeBloqueio, consumirBoasVindasPendente,
  });
})();
