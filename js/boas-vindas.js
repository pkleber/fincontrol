/* =========================================================
   boas-vindas.js — tela de boas-vindas após o login
   Aparece no Dashboard logo depois de entrar (aviso do auth.js)
   e enquanto config.boasVindasVista não for true.
   Primeiro acesso: tour completo. Depois: versão curta de
   "que bom te ver de novo". Pode ser reexibida em Configurações.
   ========================================================= */

/**
 * Marca a tela como vista e guarda o nome digitado (sem mutar o objeto lido).
 * Campo vazio mantém o nome que já estava salvo.
 */
function marcarBoasVindasVista() {
  const campoNome = document.getElementById("boas-vindas-nome");
  const nome = normalizarNome(campoNome ? campoNome.value : "");
  const config = lerConfig();
  try {
    salvarConfig({ ...config, ...(nome && { nome }), boasVindasVista: true });
  } catch {
    // gravar() já avisou o usuário; a tela só volta a aparecer no próximo acesso
  }
  if (typeof renderizarSaudacao === "function") renderizarSaudacao();
}

/** Versão curta para quem já conhece o app: saúda pelo nome e esconde o tour */
function prepararRetorno(dialogo) {
  const nome = normalizarNome(lerConfig().nome);
  dialogo.classList.add("boas-vindas--retorno");
  document.getElementById("boas-vindas-titulo").textContent =
    nome ? `Que bom te ver de novo, ${nome}!` : "Que bom te ver de novo!";
  const intro = dialogo.querySelector(".boas-vindas__intro");
  if (intro) intro.textContent = `${saudacaoPorHorario()}! Seu painel está pronto. Bora organizar as finanças?`;
}

document.addEventListener("DOMContentLoaded", () => {
  const dialogo = document.getElementById("boas-vindas");
  if (!dialogo || typeof dialogo.showModal !== "function") return;
  const acabouDeEntrar = AUTH.consumirBoasVindasPendente();
  const jaViu = lerConfig().boasVindasVista === true;
  if (jaViu && !acabouDeEntrar) return;

  if (jaViu) prepararRetorno(dialogo);

  // Fechar por qualquer caminho (botão, Esc) conta como visto
  dialogo.addEventListener("close", marcarBoasVindasVista);

  // Clique no fundo escurecido (fora da caixa) fecha a tela
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });

  // O link para Transações navega: marca como visto antes de sair
  const linkComecar = document.getElementById("boas-vindas-comecar");
  if (linkComecar) linkComecar.addEventListener("click", marcarBoasVindasVista);

  // Preenche com o nome já salvo (útil ao rever a tela pelas Configurações)
  const campoNome = document.getElementById("boas-vindas-nome");
  if (campoNome) campoNome.value = normalizarNome(lerConfig().nome);

  dialogo.showModal();
});
