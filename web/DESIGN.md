# Racha Aí — decisões visuais

**Conceito:** "adesivo de geladeira de república" adaptado ao escuro. Cartões grafite com borda visível e
sombra deslocada sólida (neo-brutalismo leve), emojis como ícones. Divertido, mas legível. Tema escuro **único**
(sem `prefers-color-scheme`, `color-scheme: dark`). Ver spec 003.

## Tokens (CSS vars em `app/globals.css`, expostos ao Tailwind via `@theme inline`)
| Token (classe) | Valor | Uso |
|---|---|---|
| `bg-base` | #0F141C | fundo sólido do `html` (a camada translúcida nunca fica sobre branco) |
| `bg` | rgb(37 45 60 / 0.70) | `body` por cima da base (efetivo ≈ #1E2632), sem pontilhado |
| `surface` / `surface-2` | #1C2330 / #252D3C | cartões / inputs, áreas internas, item de menu ativo |
| `line` / `shadow` | #333D50 / #0B0F15 | bordas (essenciais: cartão e fundo têm luminância parecida) / sombra sticker |
| `muted` | #7A8497 | **texto padrão do body** (cor pedida, ~4.2:1 no cartão). Só em texto ≥ 14px |
| `muted-strong` | #A3ACBD | texto `xs`, hints, placeholders, itens de menu inativos, legendas (~6.9:1) |
| `ink` | #E6EAF2 | títulos `h1–h4`, valores, labels, `strong`, inputs (≥ 12:1) |
| `brand` / `brand-hover` / `brand-ink` | #4F46E5 / #4338CA / #FFF | `btn-primary` (6.3:1). **Nunca como cor de texto** |
| `link` / `focus` | #A5B4FC | links de texto e anel de foco 3px em todo `:focus-visible` |
| `accent` / `accent-ink` | #FFC24D / #1E1A2B | destaques, logo, banner de sugestão (texto sempre escuro) |
| `pos` / `pos-soft` | #4ADE80 / 12% | "recebe" |
| `neg` / `neg-soft` | #F87171 / 12% | "deve", erros, excluir |
| `chart-1..5` | #818CF8 #4ADE80 #FFC24D #F87171 #38BDF8 | séries de gráfico |

**Contraste — decisão registrada:** #7A8497 fica abaixo de AA (4.5:1) para texto pequeno; mantido por pedido
explícito, só em texto ≥ 14px. Regra base em `@layer base` pinta `h1–h4`, `strong`, `label`, `legend`, `dt`, `th`,
`.font-black`, `.font-extrabold` e `.tabular-nums` com `ink` (utilitários `text-*` continuam vencendo).
Texto `text-xs` usa sempre `text-muted-strong`. `viewport.themeColor` = #1E2632.

## Componentes (classes em `@layer components`)
`card`, `btn` + `btn-primary|accent|ghost|danger`, `btn-icon` (44px), `input`, `field-label`, `hint`, `alert-error`,
`nav-link` (item de menu; `aria-current="page"` ganha fundo `surface-2`, borda e sombra).
Alvos de toque ≥ 44px (`min-h-11`/`size-11`); botões "afundam" no `:active` (sem animação com `prefers-reduced-motion`).

## Shell (variação A — `features/shell/`)
- `app/layout.tsx`: só html/body, tema e skip link "Pular para o conteúdo" (→ `#conteudo`).
- Route group `app/(app)/` com `AppShell`: `Navbar` (`<header>` sticky h-16: botão Menu `md:hidden`, logo,
  CTA "Novo rolê" → `/groups#novo`), `Sidebar` (`<aside>` + `<nav aria-label="Principal">`, ≥ md, grid
  `md:grid-cols-[16rem_1fr]`, sticky), `<main id="conteudo" tabIndex={-1}>` e `Footer`.
- `SidebarNav` (client) usa `usePathname` e marca `aria-current="page"` (Dashboard exato em `/`; Rolês e Pessoas
  por prefixo). Itens em `nav-items.ts`.
- `MobileNav` (client): `<dialog>` com `showModal()` como drawer à esquerda; foco preso e Esc pelo navegador,
  fecha no clique no backdrop, ao clicar num item e na mudança de rota; o foco volta ao botão Menu.
- Sticky leva em conta `--shell-top` (0 por padrão; 2.75rem nas páginas de sugestão, por causa do banner).
- `html { scroll-padding-top }` evita que âncoras fiquem sob a navbar.

## Páginas (spec 003)
- `/` dashboard · `/groups` lista + "Novo rolê" (`#novo`, cria e redireciona para o detalhe) · `/people` (+ `new`, `[id]`, `[id]/edit`).
- Rolê em sub-rotas: `layout.tsx` com `PageHeader` (voltar, nome, total, nº de pessoas, "Editar") + `GroupTabs`;
  abas Visão geral / Despesas / Acerto / Pessoas. `GroupTabs` reaproveita `.nav-link` (mesmo `aria-current`),
  em linha com rolagem horizontal no celular. `edit` = renomear + cartão "Zona de perigo" (`card border-neg`).
- Dados do rolê via `lib/queries.ts` (`React.cache`): layout, página e `generateMetadata` dividem o mesmo GET;
  400/404 → `not-found`. Títulos de aba: "Rolê — Seção".
- Pessoas: nome do participante linka `/people/[id]`; em `/groups/[id]/members`, "Adicionar pessoa cadastrada"
  (`<select>` só com quem não está no rolê; vazio → link para `#nova-pessoa`) e "Criar pessoa nova" inline.
  Excluir pessoa vinculada mostra o 409 da API ao lado do botão.

## Componentes compartilhados (`features/ui`)
`PageHeader` (voltar + h1 + descrição + ações), `SectionTitle` (h2 com emoji em quadradinho), `EmptyState`
(emoji + título + copy + ação), `StatTile` (KPI dentro de `<dl>`: `dt` rótulo `muted-strong`, `dd` valor `ink`
ou `pos`/`neg` — cor sempre acompanhada do rótulo), `ActionButton`, `FormError`, `Skeleton`.
`features/people/PersonAvatar` (inicial no círculo `accent`).

## Gráficos (`features/charts`, Server Components, só SVG — sem dependência)
- Geometria pura e testada em `lib/charts.ts` (`niceMax`, `ticks`, `barLayout`, `donutArcs`, `linePath`, `monthLabel`).
- `ChartFrame`: `<figure>` em `.card` com `<figcaption>` (h3 + subtítulo), `<svg role="img" aria-label="resumo com
  todos os valores">` e `<table class="sr-only">` com os mesmos dados. Sem dados → caixa tracejada com copy simpática.
- `BarChart` horizontal, série única: rótulo (ink) e valor (muted-strong) **acima** da barra, trilho `surface-2`,
  barra 12px com ponta arredondada 4px. viewBox de 320 de largura para o texto não ficar minúsculo no celular.
- `LineChart`: linha 2px + área 12%, pontos r=4 com anel `surface`, grade 1px `line`, eixo Y compacto
  (`formatBRLCompact`), alvo de hover r=12 com `<title>` (tooltip nativo, sem JS).
- `DonutChart`: anel com 2px de separação (`stroke surface`), total no centro, legenda com cor + nome + valor + %.
  "Pendente × Quitado" usa `chart-3` (âmbar) × `chart-1` (índigo): verde × âmbar falha em protanopia (ΔE 5,2).
- Cores das séries só nas marcas; textos sempre `ink`/`muted-strong`. Um gráfico por ideia, nunca eixo duplo.

## Sugestões de layout (temporário — remover após a escolha)
`/sugestoes` (índice com prós/contras) e `/sugestoes/{a,b,c}` com dados fictícios (`features/sugestoes/`), fora do
`(app)`. Banner `role="note"` amarelo fixo no topo "SUGESTÃO — REMOVER APÓS A ESCOLHA".
A = shell oficial; B = trilho de ícones recolhível (4rem ↔ 16rem, `localStorage`) + topbar com busca visual;
C = tabs no topo + atalhos contextuais à direita. Remoção: `grep -rln "remover-apos-escolha" web/app web/features` e apague os arquivos listados, exceto `Footer.tsx` (lá sai só a linha do link).

## Padrões
- Mobile-first, coluna única até `sm`, grid 2 col em listas de rolês/pessoas/saldos e nos gráficos (≥ md).
- Datas no fuso `America/Sao_Paulo` (`lib/format.ts`), igual à agregação mensal da API.
- Saldos: verde "recebe" / vermelho "deve" / neutro "zerado" — cor **e** texto + sinal (+/−), nunca só cor.
- Valores sempre `tabular-nums`, formatados com `Intl.NumberFormat('pt-BR')`.
- Estados: vazio com emoji + copy simpática (`EmptyState`); loading com skeletons pulsantes (um `loading.tsx` por
  área: dashboard, rolês, detalhe do rolê, pessoas); erro em cartão com borda vermelha e dica "Suba a API com npm run
  dev"; 404 "Esse rolê sumiu do mapa" / "Essa pessoa sumiu do mapa" (`features/ui/NotFoundState`).
- Formulários de criar/editar redirecionam no sucesso (`redirect` na Server Action); toda mutação chama
  `revalidatePath('/', 'layout')`.
- Erros de formulário em `role="alert"`; o que foi digitado é preservado em caso de erro.
- QR Code em `<details>` (gerado só ao abrir), fundo branco fixo para leitura.
- Fonte: pilha do sistema arredondada (`ui-rounded`, Nunito…) — sem download no build.
