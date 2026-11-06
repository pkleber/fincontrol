/* =========================================================
   validacao.js — confere o formato de um backup antes de importar
   Um arquivo editado à mão ou corrompido não pode chegar ao
   localStorage: com dados no formato errado, as páginas quebram.
   Requer: storage.js (STORAGE_CHAVES).
   ========================================================= */

// Regras ficam num escopo próprio; só validarBackup() vira global.
const validarBackup = (() => {
  const RE_DATA = /^\d{4}-\d{2}-\d{2}$/; // "2026-07-08"
  const RE_MES = /^\d{4}-\d{2}$/;       // "2026-07"
  const TIPOS_TRANSACAO = ["receita", "despesa"];
  const TEMAS = ["claro", "escuro", "sistema"];

  // ---------- Regras simples, reaproveitadas pelos esquemas ----------
  const texto = (v) => typeof v === "string" && v.trim() !== "";
  const numero = (v) => typeof v === "number" && Number.isFinite(v);
  const positivo = (v) => numero(v) && v > 0;
  const naoNegativo = (v) => numero(v) && v >= 0;
  const data = (v) => typeof v === "string" && RE_DATA.test(v);
  const mes = (v) => typeof v === "string" && RE_MES.test(v);
  const diaDoMes = (v) => Number.isInteger(v) && v >= 1 && v <= 31;
  const opcional = (regra) => (v) => v === undefined || v === null || regra(v);
  const umDe = (opcoes) => (v) => opcoes.includes(v);

  const aporteValido = (a) => a && data(a.data) && positivo(a.valor);

  /** Campos obrigatórios de cada tipo de registro (nome do campo → regra) */
  const ESQUEMAS = {
    transacoes: {
      id: texto, tipo: umDe(TIPOS_TRANSACAO), descricao: texto, valor: positivo, data,
      categoriaId: opcional(texto), contaId: opcional(texto), cartaoId: opcional(texto),
    },
    categorias: { id: texto, nome: texto, tipo: umDe(TIPOS_TRANSACAO) },
    contas: { id: texto, nome: texto, tipo: texto, saldoInicial: numero },
    cartoes: {
      id: texto, nome: texto, limite: naoNegativo,
      diaFechamento: diaDoMes, diaVencimento: diaDoMes, contaId: opcional(texto),
    },
    metas: { id: texto, nome: texto, valorAlvo: positivo, valorAtual: naoNegativo, prazo: data },
    orcamentos: { id: texto, categoriaId: texto, mes, limite: positivo },
    caixinhas: {
      id: texto, nome: texto, valorAplicado: positivo, percentualCDI: positivo, dataAplicacao: data,
      aportes: opcional((lista) => Array.isArray(lista) && lista.every(aporteValido)),
    },
  };

  /** Valida um registro; retorna o nome do primeiro campo inválido, ou null */
  function campoInvalido(registro, esquema) {
    if (!registro || typeof registro !== "object" || Array.isArray(registro)) return "(registro)";
    const invalido = Object.entries(esquema).find(([campo, regra]) => !regra(registro[campo]));
    return invalido ? invalido[0] : null;
  }

  /**
   * Valida um backup inteiro. Retorna a lista de problemas encontrados
   * (vazia = backup válido). Seções ausentes são aceitas: backups antigos
   * não têm metas, orçamentos nem caixinhas.
   */
  function validar(backup) {
    if (!backup || typeof backup !== "object" || backup.app !== "FinControl") {
      return ["Este arquivo não parece ser um backup do FinControl."];
    }

    const problemas = [];

    Object.entries(ESQUEMAS).forEach(([secao, esquema]) => {
      const lista = backup[secao];
      if (lista === undefined) return;
      if (!Array.isArray(lista)) {
        problemas.push(`"${secao}" deveria ser uma lista.`);
        return;
      }
      lista.forEach((registro, i) => {
        const campo = campoInvalido(registro, esquema);
        if (campo) problemas.push(`${secao}, item ${i + 1}: campo "${campo}" ausente ou inválido.`);
      });
    });

    const config = backup.config;
    if (config !== undefined) {
      const configValida =
        config && typeof config === "object" && !Array.isArray(config) &&
        opcional(umDe(TEMAS))(config.tema) && opcional(naoNegativo)(config.cdiAnual);
      if (!configValida) problemas.push('"config" tem tema ou CDI inválido.');
    }

    return problemas;
  }

  return validar;
})();
