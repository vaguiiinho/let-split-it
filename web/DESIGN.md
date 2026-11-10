# Racha Aí — decisões visuais

**Conceito:** "adesivo de geladeira de república". Cartões brancos com borda grossa escura e sombra
deslocada sólida (neo-brutalismo leve), fundo creme pontilhado, emojis como ícones. Divertido, mas legível.

## Tokens (CSS vars em `app/globals.css`, expostos ao Tailwind via `@theme inline`)
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | #FFF7E8 creme | #15121D berinjela | fundo |
| `surface` / `surface-2` | #FFF / #FFF0D6 | #211B2D / #2B2339 | cartões / áreas internas |
| `ink` / `muted` | #1E1A2B / #554E69 | #F6F1FF / #BDB3D1 | texto (≥ 7:1 / ≥ 7:1) |
| `brand` | #0A7457 verde PIX (branco em cima 5.8:1) | #3DDC97 (texto escuro) | ações principais, "recebe" |
| `accent` | #FFB020 manga | #FFC24D | destaques, valores, CTA divertido (texto sempre escuro) |
| `neg` | #B4233A | #FF8597 | "deve", erros, excluir |
| `focus` | #6D28D9 | #C9ADFF | anel de foco 3px em todo `:focus-visible` |

Tema escuro automático por `prefers-color-scheme` (só troca as vars).

## Componentes (classes em `@layer components`)
`card`, `btn` + `btn-primary|accent|ghost|danger`, `btn-icon` (44px), `input`, `field-label`, `hint`, `alert-error`.
Alvos de toque ≥ 44px; botões "afundam" no `:active` (sem animação com `prefers-reduced-motion`).

## Padrões
- Mobile-first, coluna única até `sm`, grid 2 col em listas de rolês/saldos.
- Saldos: verde "recebe" / vermelho "deve" / neutro "zerado" — cor **e** texto + sinal (+/−), nunca só cor.
- Valores sempre `tabular-nums`, formatados com `Intl.NumberFormat('pt-BR')`.
- Estados: vazio com emoji + copy simpática; loading com skeletons pulsantes; erro em cartão com borda vermelha
  e dica "Suba a API com npm run dev"; 404 "Esse rolê sumiu do mapa".
- Erros de formulário em `role="alert"`; o que foi digitado é preservado em caso de erro.
- QR Code em `<details>` (gerado só ao abrir), fundo branco fixo para leitura nos dois temas.
- Fonte: pilha do sistema arredondada (`ui-rounded`, Nunito…) — sem download no build.
