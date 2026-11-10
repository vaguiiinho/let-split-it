# Spec 001 — Racha Aí (divisão de contas com PIX)

## Problema
Depois de um churrasco, viagem ou mês na república, o grupo nunca sabe "quem deve quanto pra quem".
As planilhas viram bagunça e acabam acontecendo transferências demais (A→B, B→C, C→A...).

## Solução
App web onde o usuário cria um **rolê** (grupo), adiciona **pessoas** (com chave PIX opcional) e lança
**despesas** (quem pagou, valor, entre quem dividir, com pesos opcionais). O app:
1. Calcula o saldo de cada pessoa (pagou − consumiu).
2. Gera a lista **mínima (heurística gulosa)** de transferências para zerar todo mundo.
3. Para cada transferência cujo recebedor tem chave PIX, gera o **PIX copia e cola (BR Code estático)** e o **QR Code**.
4. Gera um **resumo pronto para colar no WhatsApp**.

## Estrutura do repositório
```
api/   NestJS 11 + Prisma (SQLite) — porta 3333
web/   Next.js (App Router) + Tailwind — porta 3000
docs/  specs e runs
package.json (raiz) — scripts para instalar/rodar ambos (concurrently)
```

## Backend (api/) — arquitetura
```
api/src/
  domain/          entidades, value objects e serviços PUROS (sem Nest/Prisma)
    money.ts                 (Money em centavos, inteiro, >= 0)
    split.ts                 (divide valor por pesos — maior resto, soma exata)
    settlement.ts            (saldos + transferências mínimas)
    pix.ts                   (BR Code EMV + CRC16-CCITT)
    group.ts / errors.ts     (aggregate Group com invariantes)
  application/     casos de uso + portas (interfaces de repositório)
  infrastructure/  Prisma (repositório), PrismaService
  presentation/    controllers HTTP, DTOs (class-validator), exception filter
```

### Regras de domínio (invariantes)
- Nome do rolê: 1–60 chars (trim). Nome de pessoa: 1–40 chars, único no rolê (case-insensitive).
- Chave PIX opcional, até 77 chars, apenas ASCII imprimível sem espaços (o TLV do BR Code é medido em bytes).
- Nome de pessoa duplicado → 409; pagador/participante fora do rolê → 400.
- Despesa: descrição 1–80 chars; `amountCents` inteiro > 0 e ≤ 100.000.000; `payerId` deve ser membro;
  `participants` ≥ 1, membros únicos e do rolê; `weight` inteiro 1–100 (default 1).
- Não é possível remover pessoa que participa de alguma despesa (como pagador ou participante) → 409.
- **Split**: `share_i = floor(amount * w_i / Σw)`; os centavos restantes vão, um a um, aos de maior resto
  (desempate pela ordem dos participantes). Σ shares == amount sempre.
- **Settlement**: `balance = paid − owed`. Transferências: repetidamente casar maior devedor com maior credor,
  transferindo `min(|devedor|, credor)`. Σ balances == 0. Nº de transferências ≤ n−1.
- **PIX (BR Code estático)** — campos TLV (ID 2 dígitos + tamanho 2 dígitos + valor):
  `00`="01"; `26`= {`00`="br.gov.bcb.pix", `01`=chave}; `52`="0000"; `53`="986"; `54`=valor "12.34" (omitir se 0);
  `58`="BR"; `59`=nome do recebedor (sem acentos, MAIÚSCULO, máx 25); `60`=cidade (sem acentos, máx 15, default "BRASIL");
  `62`={`05`="***"}; `63`=CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) em 4 hex maiúsculos, calculado sobre todo o
  payload incluindo "6304".

### Contrato HTTP (JSON, valores sempre em centavos)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | /groups | `{name}` | 201 `GroupDetail` |
| GET | /groups | — | 200 `[{id,name,createdAt,memberCount,expenseCount,totalCents}]` (mais recente primeiro) |
| GET | /groups/:id | — | 200 `GroupDetail` |
| DELETE | /groups/:id | — | 204 |
| POST | /groups/:id/members | `{name, pixKey?}` | 201 `GroupDetail` |
| DELETE | /groups/:id/members/:memberId | — | 200 `GroupDetail` (409 se envolvido em despesa) |
| POST | /groups/:id/expenses | `{description, amountCents, payerId, participants:[{memberId, weight?}]}` | 201 `GroupDetail` |
| DELETE | /groups/:id/expenses/:expenseId | — | 200 `GroupDetail` |
| GET | /groups/:id/settlement | — | 200 `Settlement` |

```ts
GroupDetail = { id, name, createdAt, totalCents,
  members: [{ id, name, pixKey: string|null }],
  expenses: [{ id, description, amountCents, payerId, createdAt,
               participants: [{ memberId, weight, shareCents }] }] }   // expenses: mais recente primeiro
Settlement = { totalCents,
  balances: [{ memberId, name, paidCents, owedCents, balanceCents }],
  transfers: [{ fromId, fromName, toId, toName, amountCents, pixPayload: string|null }] }
Erro = { statusCode, message, error }   // 400 validação/domínio, 404 não encontrado, 409 conflito
```
CORS liberado para `http://localhost:3000`. DB: `api/prisma/dev.db` (SQLite).

## Frontend (web/)
- `web/lib/api.ts` (`server-only`): cliente fetch para `API_URL` (default `http://localhost:3333`).
- Server Actions em `web/app/**/actions.ts` com validação do input; `revalidatePath` após mutação.
- Client Components em `web/features/` (formulários, botão copiar, QR Code com lib `qrcode`).
- Telas:
  - `/` — lista de rolês + formulário "Novo rolê"; estado vazio amigável.
  - `/groups/[id]` — 3 seções: **Pessoas** (add/remover, chave PIX), **Despesas** (form: descrição, valor em R$
    aceitando "12,34", pagador, checkboxes de participantes com peso opcional; lista com remover),
    **Acerto** (saldos coloridos verde/vermelho, transferências com PIX copia-e-cola + QR expansível,
    botão "Copiar resumo pro WhatsApp").
- Formatação BRL via `Intl.NumberFormat('pt-BR')`. Mensagens de erro da API exibidas ao usuário.
- Mobile-first, acessível (labels, foco, contraste), tema claro/escuro.

## Critérios de aceite
- `npm test` passa em api/ (unit de domínio + e2e dos endpoints) e web/ (unit dos helpers).
- `npm run typecheck` / `npm run lint` passam em ambos; `npm run build` passa em web/.
- Teste do PIX valida CRC com vetor conhecido (`"123456789"` → `29B1`) e estrutura TLV.
- Cenário: A pagou 90 (A,B,C), B pagou 30 (A,B,C) → transfers: C→A 40, B→A 10 (total 2).
- Na raiz: `npm run setup` e `npm run dev` sobem tudo.
