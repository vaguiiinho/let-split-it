# 🍕 Racha Aí

> Divida as contas do rolê e quite tudo com **o mínimo de PIX**.

Churrasco, viagem, república, presente coletivo... no fim sempre vem a pergunta:
**"quem deve quanto pra quem?"** O Racha Aí resolve isso:

1. Você cria um **rolê** e adiciona as **pessoas** (com chave PIX, se quiser).
2. Lança as **despesas**: quem pagou, quanto e entre quem dividir. Dá pra usar **pesos**
   (ex.: quem levou acompanhante conta 2, criança conta 1).
3. O app calcula o saldo de cada um e gera a **menor lista de transferências** pra zerar todo mundo.
   Em vez de 6 PIX cruzados, normalmente são 2 ou 3.
4. Cada transferência sai com o **PIX copia e cola + QR Code** do recebedor, já com o valor certinho.
5. Um clique gera o **resumo pronto pro grupo do WhatsApp** 📲.

Os centavos fecham sempre: a divisão usa o método do maior resto, então a soma das partes é
exatamente o valor da despesa (R$ 100 em 3 vira 33,34 + 33,33 + 33,33).

---

## 🧱 Stack

| Parte | Tecnologia |
|---|---|
| `api/` | NestJS 11, Prisma 6 + SQLite, arquitetura em camadas (domain / application / infrastructure / presentation) |
| `web/` | Next.js 16 (App Router), React 19, Tailwind CSS 4, Server Actions, `qrcode` |
| Testes | Jest + Supertest (API), Vitest (web) |

O banco é um arquivo SQLite local (`api/prisma/dev.db`), então não precisa instalar banco nenhum.

## ✅ Pré-requisitos

- **Node.js 20+** (testado com Node 24) e **npm 10+**

## 🚀 Como rodar

Na raiz do projeto:

```bash
# 1. Instala tudo (raiz, api e web), cria o .env da API e o banco SQLite
npm run setup

# 2. Sobe API (porta 3333) e web (porta 3000) juntos
npm run dev
```

Depois é só abrir **http://localhost:3000** 🎉

> **Se o `npm install` bloquear scripts de pós-instalação** (npm 11 pode pedir aprovação), não tem problema:
> o `npm run setup` já roda o `prisma generate` explicitamente.

### Rodando cada parte separadamente

```bash
# API
cd api
npm install
npm run db:setup      # cria .env (a partir de .env.example) e o banco
npm run start:dev     # http://localhost:3333

# Web (em outro terminal)
cd web
npm install
npm run dev           # http://localhost:3000
```

### Modo produção

```bash
npm --prefix api run build && npm --prefix api start
npm --prefix web run build && npm --prefix web start
```

### Variáveis de ambiente

| Arquivo | Variável | Padrão |
|---|---|---|
| `api/.env` | `DATABASE_URL` | `file:./dev.db` |
| `api/.env` | `PORT` | `3333` |
| `web/.env.local` (opcional) | `API_URL` | `http://localhost:3333` |

## 📖 Como usar

1. **Crie um rolê** na tela inicial (ex.: "Churrasco do sábado").
2. Em **Pessoas**, adicione quem participou. A chave PIX é opcional (CPF, e-mail, telefone `+55...`
   ou chave aleatória). Quem tem chave recebe o QR Code no acerto.
3. Em **Despesas**, informe a descrição, o valor (aceita `12,34`, `1.234,56` ou `R$ 50`), quem pagou
   e marque quem participa. O peso padrão é 1; aumente pra quem consumiu mais.
4. Em **Acerto** aparece:
   - o saldo de cada pessoa (🟢 recebe / 🔴 deve);
   - as transferências necessárias, cada uma com **Copiar PIX** e **QR Code**;
   - o botão **Copiar resumo pro WhatsApp**, que monta o texto pra colar no grupo.

**Exemplo:** Ana pagou R$ 90 de carne e Bruno pagou R$ 30 de bebida, divididos entre Ana, Bruno e
Carla. Cada um deve R$ 40, então o acerto fica: **Carla → Ana R$ 40** e **Bruno → Ana R$ 10**.
São só 2 PIX.

Regras úteis:
- Não dá pra remover uma pessoa que já está em alguma despesa. Remova a despesa antes.
- Nomes de pessoas são únicos dentro do rolê.

## 🧪 Testes e qualidade

Na raiz:

```bash
npm test           # unit da API + e2e da API (SQLite separado: api/prisma/test.db) + unit do web
npm run typecheck  # tsc nos dois projetos
npm run lint       # eslint nos dois projetos
```

O que é testado: divisão com maior resto e pesos, cálculo do acerto, geração do BR Code PIX
(TLV + CRC16-CCITT validado com vetor conhecido), invariantes do rolê, todos os endpoints
(incluindo erros 400/404/409), conversão de valores em R$ e o resumo do WhatsApp.

## 🔌 API

Base: `http://localhost:3333`. Valores sempre em **centavos**.

| Método | Rota | Body |
|---|---|---|
| `POST` | `/groups` | `{ "name": "Viagem" }` |
| `GET` | `/groups` | — |
| `GET` | `/groups/:id` | — |
| `DELETE` | `/groups/:id` | — |
| `POST` | `/groups/:id/members` | `{ "name": "Ana", "pixKey": "ana@email.com" }` |
| `DELETE` | `/groups/:id/members/:memberId` | — |
| `POST` | `/groups/:id/expenses` | `{ "description": "Carne", "amountCents": 9000, "payerId": "...", "participants": [{ "memberId": "...", "weight": 1 }] }` |
| `DELETE` | `/groups/:id/expenses/:expenseId` | — |
| `GET` | `/groups/:id/settlement` | — |

Exemplo rápido com curl:

```bash
G=$(curl -s -X POST localhost:3333/groups -H 'content-type: application/json' -d '{"name":"Teste"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s -X POST localhost:3333/groups/$G/members -H 'content-type: application/json' -d '{"name":"Ana","pixKey":"ana@email.com"}'
curl -s localhost:3333/groups/$G/settlement
```

## 🗂️ Estrutura

```
api/
  src/domain/          regras puras: money, split, settlement, pix, group (sem Nest/Prisma)
  src/application/     casos de uso e portas
  src/infrastructure/  Prisma (repositório)
  src/presentation/    controllers, DTOs, filtro de erros
  prisma/schema.prisma
  test/                e2e
web/
  app/                 páginas (Server Components) e Server Actions
  features/            Client Components (formulários, PIX, QR Code, WhatsApp)
  lib/                 cliente da API (server-only), helpers de dinheiro e resumo
  DESIGN.md            decisões visuais
docs/
  specs/               especificação da feature
  runs/                registro da execução
```

## ⚠️ Limitações conhecidas

- O app é **local e sem login**: qualquer pessoa com acesso à URL vê e edita os rolês.
- O PIX gerado é um **BR Code estático**: confira nome e valor no app do banco antes de confirmar.
- A lista de transferências usa uma heurística gulosa. Ela garante no máximo *n − 1* PIX, que
  na prática é ótimo ou muito perto disso, mas não é sempre o mínimo absoluto.
