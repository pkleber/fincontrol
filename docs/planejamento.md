# FinControl — Documento de Planejamento

> **Projeto:** FinControl — Controle Financeiro Pessoal
> **Autor:** Kleber
> **Data de início do planejamento:** Julho/2026
> **Status:** Em planejamento

---

## 1. Visão do Projeto

O FinControl é um web app de **controle financeiro pessoal**, desenvolvido como projeto de estudo e uso real. O objetivo é centralizar em um só lugar:

- Registro de **receitas e despesas**
- **Gráficos e relatórios** de evolução financeira
- **Metas e orçamento** mensal
- Gestão de **contas e cartões**
- Acompanhamento de **investimentos** (caixinhas atreladas ao CDI)

### Propósito duplo

1. **Uso pessoal:** ter visibilidade real das finanças mês a mês.
2. **Aprendizado:** aplicar na prática o conteúdo estudado de HTML, CSS e JavaScript, evoluindo o projeto conforme o estudo avança.

---

## 2. Stack Tecnológica

### Fase inicial (front-end puro)

| Camada | Tecnologia | Papel |
|---|---|---|
| Estrutura | HTML5 semântico | Marcação das telas |
| Estilo | CSS3 (Flexbox, Grid, variáveis, `@property`) | Layout e tema |
| Comportamento | JavaScript (ES6+) | Lógica, cálculos, DOM |
| Persistência | `localStorage` (JSON) | Salvar dados no navegador |
| Gráficos | Chart.js (via CDN) | Gráficos de pizza, barra e linha |

### Evolução futura (fora do escopo inicial)

- Backend (Node.js) + banco de dados → dados sincronizados entre dispositivos
- Autenticação de usuário
- PWA (uso offline + instalável no celular)

> **Decisão de arquitetura:** começar 100% front-end com `localStorage` mantém o projeto alinhado ao estudo atual e permite ter algo funcional rápido. A estrutura de dados em JSON facilita a migração futura para um banco real.

---

## 3. Modelo de Dados (localStorage)

Todos os dados serão salvos como JSON. Estruturas principais:

### 3.1 Transação (`transactions`)

```json
{
  "id": "uuid",
  "tipo": "receita | despesa",
  "descricao": "Salário",
  "valor": 3500.00,
  "data": "2026-07-05",
  "categoriaId": "cat-01",
  "contaId": "conta-01",
  "cartaoId": null,
  "recorrente": false
}
```

### 3.2 Categoria (`categories`)

```json
{
  "id": "cat-01",
  "nome": "Alimentação",
  "tipo": "despesa",
  "cor": "#e74c3c",
  "icone": "🍽️"
}
```

### 3.3 Conta (`accounts`)

```json
{
  "id": "conta-01",
  "nome": "Nubank",
  "tipo": "corrente | poupanca | carteira",
  "saldoInicial": 1000.00
}
```

### 3.4 Cartão (`cards`)

```json
{
  "id": "cartao-01",
  "nome": "Nubank Crédito",
  "limite": 2000.00,
  "diaFechamento": 3,
  "diaVencimento": 10,
  "contaId": "conta-01"
}
```

### 3.5 Meta (`goals`)

```json
{
  "id": "meta-01",
  "nome": "Reserva de emergência",
  "valorAlvo": 10000.00,
  "valorAtual": 2500.00,
  "prazo": "2026-12-31"
}
```

### 3.6 Orçamento (`budgets`)

```json
{
  "id": "orc-01",
  "categoriaId": "cat-01",
  "mes": "2026-07",
  "limite": 800.00
}
```

### 3.7 Investimento / Caixinha CDI (`investments`)

```json
{
  "id": "inv-01",
  "nome": "Caixinha Viagem",
  "valorAplicado": 1500.00,
  "percentualCDI": 100,
  "dataAplicacao": "2026-01-15",
  "aportes": [
    { "data": "2026-03-01", "valor": 300.00 }
  ]
}
```

> **Nota sobre o CDI:** na fase inicial, a taxa do CDI será um valor configurável manualmente nas configurações do app (ex.: 10,5% a.a.). O rendimento é estimado com juros compostos diários úteis (~252 dias/ano). Integração com API de cotação real fica para uma fase futura.

---

## 4. Telas / Páginas

| # | Tela | Conteúdo principal |
|---|---|---|
| 1 | **Dashboard** | Saldo total, resumo do mês (receitas x despesas), gráfico de pizza por categoria, últimas transações, progresso das metas |
| 2 | **Transações** | Lista com filtros (mês, tipo, categoria, conta), botão de nova transação (modal ou formulário) |
| 3 | **Contas & Cartões** | Cards com saldo de cada conta, limite usado dos cartões, fatura atual |
| 4 | **Metas & Orçamento** | Barras de progresso das metas, orçamento por categoria com alerta visual ao estourar |
| 5 | **Investimentos** | Caixinhas com valor aplicado, rendimento estimado e projeção |
| 6 | **Relatórios** | Gráfico de linha (evolução mensal), comparativo mês a mês, exportação (CSV) |
| 7 | **Configurações** | Gerenciar categorias, taxa do CDI, backup/restauração dos dados (exportar/importar JSON) |

### Navegação

- **Desktop:** menu lateral fixo (sidebar)
- **Mobile:** menu inferior ou hambúrguer (design responsivo com media queries)

---

## 5. Roadmap de Desenvolvimento

O projeto será construído em fases incrementais — cada fase entrega algo utilizável.

### 🟢 Fase 1 — Fundação + MVP (registro de transações)

- [ ] Estrutura de pastas do projeto
- [ ] Layout base (HTML semântico + CSS: sidebar, header, área de conteúdo)
- [ ] Tema com variáveis CSS (cores, espaçamentos, modo claro/escuro futuro)
- [ ] CRUD de transações (criar, listar, editar, excluir)
- [ ] Categorias pré-definidas
- [ ] Persistência em `localStorage`
- [ ] Resumo do mês no Dashboard (total de receitas, despesas e saldo)

**Resultado:** já dá pra usar no dia a dia para registrar gastos.

### 🔵 Fase 2 — Visualização (gráficos e relatórios)

- [ ] Integrar Chart.js
- [ ] Gráfico de pizza: despesas por categoria
- [ ] Gráfico de barras: receitas x despesas por mês
- [ ] Gráfico de linha: evolução do saldo
- [ ] Filtros por período
- [ ] Exportar transações em CSV

### 🟡 Fase 3 — Contas e Cartões

- [ ] CRUD de contas com saldo calculado automaticamente
- [ ] CRUD de cartões (limite, fechamento, vencimento)
- [ ] Vincular transações a contas/cartões
- [ ] Visualização da fatura do cartão por período de fechamento

### 🟠 Fase 4 — Metas e Orçamento

- [ ] CRUD de metas com barra de progresso
- [ ] Orçamento mensal por categoria
- [ ] Alertas visuais (80% e 100% do orçamento)

### 🟣 Fase 5 — Investimentos (caixinhas CDI)

- [ ] CRUD de caixinhas
- [ ] Cálculo de rendimento estimado (% do CDI, juros compostos)
- [ ] Aportes adicionais por caixinha
- [ ] Projeção de rendimento futuro

### ⚪ Fase 6 — Refinamento

- [ ] Modo escuro
- [ ] Responsividade completa (mobile-first review)
- [ ] Backup/restauração (exportar e importar JSON)
- [ ] Acessibilidade (contraste, navegação por teclado, ARIA)
- [ ] Revisão de código e organização em módulos JS

---

## 6. Estrutura de Pastas

```
fincontrol/
├── index.html            # Dashboard
├── pages/
│   ├── transacoes.html
│   ├── contas.html
│   ├── metas.html
│   ├── investimentos.html
│   ├── relatorios.html
│   └── configuracoes.html
├── css/
│   ├── reset.css
│   ├── variaveis.css     # Cores, fontes, espaçamentos
│   ├── layout.css        # Sidebar, grid geral
│   └── componentes.css   # Cards, botões, modais, tabelas
├── js/
│   ├── app.js            # Inicialização
│   ├── storage.js        # Leitura/escrita no localStorage
│   ├── transacoes.js
│   ├── contas.js
│   ├── metas.js
│   ├── investimentos.js
│   ├── graficos.js       # Integração com Chart.js
│   └── utils.js          # Formatação de moeda, datas, uuid
└── assets/
    └── icons/
```

> **Boa prática:** manter cada módulo JS responsável por uma área do app. Mesmo sem framework, isso simula a organização por componentes e facilita a manutenção.

---

## 7. Conexão com os Estudos

| Conteúdo estudado | Onde aplicar no FinControl |
|---|---|
| HTML semântico | Estrutura das páginas (`main`, `section`, `nav`, `table`) |
| CSS: unidades, container, overflow | Layout responsivo, tabelas com scroll |
| CSS: variáveis e `@property` | Tema do app, animações de barras de progresso |
| CSS: listas | Menu de navegação, lista de transações |
| JavaScript (próxima etapa) | Toda a lógica: CRUD, cálculos, DOM, localStorage |
| Redes / protocolos | Base para a fase futura com backend e APIs |

---

## 8. Critérios de Sucesso do MVP

1. Registrar uma despesa em menos de 10 segundos
2. Ver o saldo do mês assim que abrir o app
3. Dados não se perdem ao fechar o navegador
4. Funciona bem no desktop e no celular

---

## 9. Próximos Passos Imediatos

1. Criar o repositório local (e opcionalmente no GitHub)
2. Montar a estrutura de pastas da seção 6
3. Iniciar a **Fase 1**: layout base com HTML + CSS
4. Definir a paleta de cores e tipografia do app
