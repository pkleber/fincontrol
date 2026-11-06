# FinControl 💰

Web app de **controle financeiro pessoal**, desenvolvido com HTML, CSS e JavaScript puro como projeto de estudo e uso real.

## Como executar

Não há dependências nem build: basta abrir o `index.html` no navegador, ou usar a extensão **Live Server** do VS Code para recarregamento automático.

> Os gráficos usam o **Chart.js** via CDN, então precisam de internet. O resto do app funciona offline.

## Funcionalidades

### 📊 Dashboard
- Saldo, receitas e despesas do mês atual em **cores de semáforo**:
  saldo em **verde**, receitas em **amarelo** e despesas em **vermelho** (saldo negativo fica vermelho)
- Gráfico de despesas por categoria
- Progresso das metas (aparece quando há metas cadastradas)
- Últimas 5 transações

### 💸 Transações
- Criar, editar e excluir receitas e despesas
- Vincular a uma conta ou cartão de crédito
- Filtro por mês

### 🏦 Contas & Cartões
- Contas (corrente, poupança, carteira) com saldo calculado a partir das transações
- Cartões com limite, uso em % e fatura atual calculada pelo dia de fechamento

### 🎯 Metas & Orçamento
- Metas com barra de progresso, prazo e botão **+ Guardar** para aportes rápidos
- Sugestão de quanto guardar por mês para bater a meta no prazo
- Orçamento mensal por categoria de despesa, com alertas visuais:
  **âmbar** a partir de 80% e **vermelho** a partir de 100% (com o valor estourado)

### 📈 Investimentos (caixinhas CDI)
- Caixinhas com valor inicial, % do CDI e data da aplicação
- Aportes adicionais a qualquer momento
- Rendimento bruto estimado por juros compostos em dias úteis (252/ano)
- Aplicações e aportes com data futura só começam a render na própria data
- Projeção do saldo em 6 e 12 meses
- Totais: aplicado, valor atual e rendimento

### 📑 Relatórios
- Receitas x despesas por mês e evolução do saldo acumulado
- Filtro por período (padrão: últimos 6 meses, até 10 anos)
- Exportação em **CSV** compatível com o Excel pt-BR

### ⚙️ Configurações
- Tema **claro**, **escuro** ou **seguir o sistema** (acompanha a troca do sistema em tempo real)
- Taxa do CDI (compartilhada com a tela de Investimentos)
- Categorias personalizáveis de receita e despesa
- **Backup** e **restauração** de todos os dados em JSON
  - o backup é conferido inteiro antes de importar: um arquivo inválido ou adulterado é recusado sem alterar nada
  - se a gravação falhar no meio (ex.: armazenamento cheio), a importação é desfeita e os dados anteriores são mantidos
  - ao exportar, avisa se alguma parte dos dados estiver corrompida
- Zona de perigo: apagar todos os dados

### ✨ Interface
- Layout responsivo: sidebar no desktop e navegação horizontal no celular
- Sidebar com ícones, animação ao passar o mouse e destaque de cor na página atual
- Botão de **setinha** para recolher a sidebar só nos ícones (a escolha fica salva entre as páginas)
- Conteúdo centralizado na tela
- Campos com animações discretas: entrada suave, anel de foco e destaque de erro
- Respeita a preferência do sistema por **menos movimento**

## Dados e privacidade

Todos os dados ficam **apenas no navegador** (`localStorage`); nada é enviado a servidores.
Por isso, exporte um backup de vez em quando pela tela de Configurações.

| Chave | Conteúdo |
|---|---|
| `fincontrol.transacoes` | receitas e despesas |
| `fincontrol.categorias` | categorias personalizadas |
| `fincontrol.contas` / `fincontrol.cartoes` | contas e cartões |
| `fincontrol.metas` / `fincontrol.orcamentos` | metas e orçamentos mensais |
| `fincontrol.caixinhas` | caixinhas de investimento e aportes |
| `fincontrol.config` | tema e taxa do CDI |
| `fincontrol.sidebar` | sidebar recolhida ou expandida |

Textos digitados pelo usuário e ids vindos de backups são escapados antes de ir para a tela
(proteção contra XSS), e os formulários recusam campos vazios ou só com espaços e valores inválidos.
As datas usam o **fuso local**, não o UTC.

## Estrutura

```
fincontrol/
├── index.html          # Dashboard
├── pages/              # Transações, Contas, Metas, Investimentos, Relatórios, Configurações
├── css/
│   ├── reset.css
│   ├── variaveis.css   # tokens de cor/espaço + tema escuro
│   ├── layout.css      # sidebar e área de conteúdo
│   └── componentes.css # cards, formulários, botões, barras
├── js/
│   ├── tema.js         # aplica o tema antes da página renderizar
│   ├── sidebar.js      # botão de recolher a sidebar + ícones do menu
│   ├── storage.js      # leitura/escrita no localStorage
│   ├── utils.js        # moeda, datas locais, escape de HTML, downloads
│   ├── validacao.js    # confere o backup antes de importar
│   ├── categorias.js
│   ├── graficos.js     # Chart.js com as cores do tema
│   └── <página>.js     # um script por tela
└── docs/               # planejamento do projeto
```

## Status do projeto

🏁 **Roadmap concluído**: todas as 6 fases do planejamento foram entregues.

O histórico do planejamento está em [`docs/planejamento.md`](docs/planejamento.md).
