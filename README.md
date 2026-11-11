# FinControl 💰

Web app de **controle financeiro pessoal**, desenvolvido com HTML, CSS e JavaScript puro como projeto de estudo e uso real.

## Como executar

Não há dependências nem build: basta abrir o `index.html` no navegador (sem login, ele leva para `login.html`), ou usar a extensão **Live Server** do VS Code para recarregamento automático.

> Os gráficos usam o **Chart.js** via CDN, então precisam de internet. O resto do app funciona offline.

## Funcionalidades

### 🔐 Login e conta gratuita
- Tela de **login/cadastro animada** (`login.html`): gráfico de alta que se desenha, moedas subindo e cartão com abas
- Cadastro pede só **nome, e-mail e senha** (mín. 8 caracteres, com medidor de força)
- Opção **manter conectado** (30 dias); sem ela, a sessão vale só para a aba (até 12h)
- Após entrar, abre a **tela de boas-vindas**: tour completo no primeiro acesso e uma saudação curta nos seguintes
- Botão **Sair** no pé da sidebar
- Cada conta tem seus próprios dados; a primeira conta criada herda os dados que já existiam no navegador

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
- Gráficos **interativos**: ao passar o mouse, cada mês mostra saldo, % de economia,
  maior gasto e nº de transações
- Clique em um mês (ou escolha no seletor) para abrir os **detalhes do mês**:
  comparação com o mês anterior, despesas por categoria e lista de transações
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

## Segurança

- **Senhas**: nunca são guardadas. Fica só um hash **PBKDF2-SHA256** (600 mil iterações, sal aleatório por conta), comparado em tempo constante
- **Força bruta**: após 5 senhas erradas o login bloqueia por 30s, dobrando a cada novo erro (máx. 15 min). A mensagem de erro é sempre a mesma, para não revelar quais e-mails têm conta
- **Páginas protegidas**: sem sessão válida, qualquer página redireciona para o login antes de mostrar dados
- **Content-Security-Policy** em todas as páginas: só roda script do próprio app e do jsDelivr (Chart.js, com verificação de integridade SRI); bloqueia scripts injetados, plugins e `<base>`
- **XSS**: todo texto do usuário é escapado antes de ir para o HTML; ids do backup são validados
- **Backup**: validado por inteiro antes de importar, limitado a 5 MB, importação reversível
- **CSV**: células que começam com `=`, `+`, `-` ou `@` são neutralizadas (CSV injection)

> ⚠️ **Limite honesto:** o FinControl não tem servidor. O login separa perfis e protege contra
> quem só abre o app, mas os dados ficam no `localStorage` **sem criptografia** — quem tiver
> acesso ao navegador com DevTools consegue lê-los. Não use em computador compartilhado com
> pessoas em quem você não confia.

### HTTPS / certificado
Hoje o app roda localmente (`file://` ou Live Server), então não há certificado envolvido.
Ao publicar, use um host com **HTTPS automático** (GitHub Pages, Netlify, Vercel) e marque
**Enforce HTTPS**. Em produção, prefira enviar a CSP e os cabeçalhos
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff` e `frame-ancestors 'none'`
pelo servidor (a tag `<meta>` não aceita `frame-ancestors`).

### Testes
```bash
node --test tests/*.test.js
```

## Dados e privacidade

Todos os dados ficam **apenas no navegador** (`localStorage`); nada é enviado a servidores.
Por isso, exporte um backup de vez em quando pela tela de Configurações.

Os dados de cada conta usam o prefixo `fincontrol.u.<id>.`:

| Chave | Conteúdo |
|---|---|
| `fincontrol.usuarios` | contas (nome, e-mail, sal e hash da senha) |
| `fincontrol.sessao` | sessão "manter conectado" (sem ela, fica no `sessionStorage`) |
| `fincontrol.tentativas` | contador de senhas erradas (bloqueio temporário) |
| `fincontrol.u.<id>.transacoes` | receitas e despesas |
| `fincontrol.u.<id>.categorias` | categorias personalizadas |
| `fincontrol.u.<id>.contas` / `.cartoes` | contas e cartões |
| `fincontrol.u.<id>.metas` / `.orcamentos` | metas e orçamentos mensais |
| `fincontrol.u.<id>.caixinhas` | caixinhas de investimento e aportes |
| `fincontrol.u.<id>.config` | tema, taxa do CDI e nome |
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
│   ├── relatorio-detalhes.js # cálculos do detalhamento mensal
│   └── <página>.js     # um script por tela
└── docs/               # planejamento do projeto
```

## Status do projeto

🏁 **Roadmap concluído**: todas as 6 fases do planejamento foram entregues.

O histórico do planejamento está em [`docs/planejamento.md`](docs/planejamento.md).
