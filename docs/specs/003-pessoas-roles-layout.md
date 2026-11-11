# Spec 003: Pessoas globais, edição de rolês, dashboard e layout multi-página

## Objetivo
1. **Pessoa** vira uma entidade global (módulo `people`) com CRUD. Um rolê (o `Group` atual, ou seja, "roles" = **rolês**, sem nada de RBAC) passa a ter participantes que **referenciam pessoas** (N:N). Uma pessoa pode estar em vários rolês.
2. Rolê editável (`PATCH /groups/:id`).
3. **Dashboard** com dados agregados (`GET /dashboard`) e gráficos SVG renderizados no servidor, sem dependência nova.
4. **Web multi-página** com shell (navbar, sidebar, footer). A sidebar vira drawer no mobile. A página de rolê de 297 linhas é quebrada em sub-rotas.
5. **3 sugestões de layout** em `/sugestoes/{a,b,c}`, marcadas para remoção. O shell oficial usa a variação **A** até a escolha.
6. **Novo tema escuro único** com as cores pedidas.

Fora de escopo: autenticação, multi-tenant, migrations versionadas.

## Regras de negócio
Erros: `ValidationError`→400, `NotFoundError`→404, `ConflictError`→409. O corpo continua `{statusCode, message, error}`. Ids passam por `UniqueEntityId` (não-v4 → 400 `Identificador inválido`), como na spec 002.

**Pessoa**
- P1. `name` (`PersonName`, 1–40, trim) é **único globalmente, sem diferenciar maiúsculas/minúsculas** (chave `name.trim().toLocaleLowerCase('pt-BR')`). Se já existir → 409 `Já existe uma pessoa chamada "<Nome>"`, tanto ao criar quanto ao renomear para o nome de outra pessoa. Renomear para o mesmo nome com outra caixa é permitido. *Justificativa:* os seletores de pessoa ficam sem ambiguidade e a busca-ou-criação inline (G3) é possível.
- P2. `pixKey` é opcional (`PixKey`, mesmas regras e mensagens atuais). `null` ou `''` limpa a chave.
- P3. O PATCH precisa trazer ao menos um campo (`name` ou `pixKey`). Caso contrário → 400 `Informe ao menos um campo para atualizar`.
- P4. Excluir uma pessoa que participa de algum rolê → 409 `Não é possível excluir uma pessoa que participa de algum rolê`. Pessoa inexistente → 404 `Pessoa não encontrada`.
- P5. Nome e chave PIX são lidos **sempre da Person**. Editar a pessoa reflete em todos os rolês, inclusive em saldos, transferências e `pixPayload`.

**Rolê / participantes**
- G1. `Group.rename(GroupName)`: mesmas regras e mensagens de `GroupName`.
- G2. O participante (`Member`) é o vínculo `groupId + personId`. **O id do membro é o `personId`**, então `payerId`, `participants[].memberId`, `fromId`, `toId` e `members[].id` passam a ser ids de pessoa. A ordem dos membros é a ordem de entrada no rolê.
- G3. `POST /groups/:id/members` aceita **exatamente um** destes formatos:
  - `{personId}`: adiciona uma pessoa existente. Pessoa ausente → 404 `Pessoa não encontrada`.
  - `{name, pixKey?}`: **busca ou cria**. Se existir uma pessoa com o mesmo nome (regra P1), ela é reaproveitada. Se `pixKey` for informada e for diferente da chave guardada (inclusive quando a pessoa não tem chave) → 409 `Já existe uma pessoa chamada "<Nome>" com outra chave PIX. Selecione-a na lista ou edite a pessoa`. Se não existir, cria a pessoa e depois adiciona ao rolê.
  - Os dois formatos juntos, ou nenhum dos dois → 400 `Informe uma pessoa existente ou o nome de uma nova pessoa`. `pixKey` junto com `personId` → 400 `Chave PIX só pode ser informada ao criar uma nova pessoa`.
  - Ordem das checagens: ids/VOs → rolê existe (404 `Rolê não encontrado`) → pessoa (404/409) → aggregate.
- G4. Pessoa que já está no rolê → 409 `<Nome> já está neste rolê`. Essa regra substitui a antiga "Já existe uma pessoa chamada X neste rolê".
- G5. `removeMember` só desfaz o vínculo e mantém a Person. As regras e mensagens atuais continuam: despesas → 409, depois pagamentos → 409. Rolê não encontrado → 404 `Pessoa não encontrada neste rolê`.
- G6. Despesas, pagamentos, saldos e acerto continuam por rolê, sem mudança de regra. Excluir um rolê apaga vínculos, despesas e pagamentos, mas **nunca** as pessoas.

**Dashboard**
- D1. `spentCents` = soma das despesas de todos os rolês. `settledCents` = soma dos pagamentos registrados. `pendingCents` = soma de `settle().transfers[].amountCents` de todos os rolês.
- D2. Status de cada rolê: `empty` (sem despesas), `settled` (com despesas e `transfers` vazio) ou `pending`.
- D3. `byGroup`: os 8 rolês com maior `totalCents > 0`, em ordem decrescente (empate → nome asc). `topPayers`: as 5 pessoas que mais pagaram despesas somando todos os rolês (`paidCents > 0`, desc, empate → nome asc).
- D4. `byMonth`: os últimos 6 meses até o mês atual (`clock.now()`), fuso `America/Sao_Paulo`, chave `YYYY-MM`. Meses sem gasto entram com 0. A data usada é `createdAt` da despesa.

## Value Objects
| VO | Local | Regra |
|---|---|---|
| `UniqueEntityId` | `shared/domain/value-objects/` (existe) | sem mudança |
| `PersonName` | `modules/people/domain/value-objects/person-name.vo.ts` | é o `MemberName` **movido e renomeado**, com as mesmas regras e mensagens (`Nome da pessoa ...`). Ganha o getter `key` (trim + `toLocaleLowerCase('pt-BR')`) e mantém `equalsIgnoreCase` |
| `PixKey` | `modules/people/domain/value-objects/pix-key.vo.ts` | **movido**, sem mudança. `text.ts` vai junto para `shared/domain/value-objects/text.ts` |
| `GroupName` | groups (existe) | sem mudança |

Os VOs de groups que usavam `MemberName`/`PixKey` passam a importar de `people/domain`. A dependência é só `groups → people`, nunca o contrário. `Clock` vai para `shared/domain/clock.port.ts`.

## Domínio
- `people/domain/person.entity.ts`: `Person.create({name, pixKey}, createdAt, id?)`, `restore({id,name,pixKey,createdAt})`, `rename(PersonName)`, `changePixKey(PixKey|null)`, getters.
- `people/domain/person.repository.ts`: token `PERSON_REPOSITORY` e porta:
  ```ts
  interface PersonRepository {
    findById(id: UniqueEntityId): Promise<Person | null>;
    findByNameKey(key: string): Promise<Person | null>;
    save(person: Person): Promise<void>;            // upsert; P2002 em nameKey → ConflictError (P1)
    delete(id: UniqueEntityId): Promise<boolean>;
    countMemberships(id: UniqueEntityId): Promise<number>;
    count(): Promise<number>;
    listSummaries(): Promise<PersonSummary[]>;      // + groupCount
    getDetail(id: UniqueEntityId): Promise<PersonDetail | null>; // + rolês
  }
  ```
- `groups/domain/entities/member.entity.ts`: `Member.restore({id /*personId*/, name: PersonName, pixKey})` e `Member.fromPerson(person: Person)`. Sai o `create` com id novo.
- `Group`: `_name` passa a ser mutável e ganha `rename(name)`. `addMember(person: Person): Member` aplica G4. `removeMember` não muda. `GroupRepository` ganha `findAll(): Promise<Group[]>` (usado pelo dashboard).

## Use Cases
Fluxo de mutação igual ao da spec 002. `PersonOutput = {id, name, pixKey: string|null, createdAt: string}`.

**`modules/people/application/use-cases/`** (deps: `PersonRepository`, `Clock` só onde indicado)
| Arquivo | Input | Output | execute() / erros |
|---|---|---|---|
| `create-person.use-case.ts` (+Clock) | `{name: string; pixKey?: string\|null}` | `PersonOutput` | VOs → `findByNameKey` (409 P1) → `Person.create` → save |
| `list-people.use-case.ts` | `{}` | `(PersonOutput & {groupCount: number})[]`, nome asc (`localeCompare` pt-BR) | — |
| `get-person.use-case.ts` | `{personId}` | `PersonOutput & {groups: {id; name; createdAt; memberCount; totalCents}[]}` (rolês por createdAt desc) | 400 id, 404 |
| `update-person.use-case.ts` | `{personId; name?: string; pixKey?: string\|null}` | `PersonOutput` | 400 P3/VO/id → 404 → se o nome mudar: `findByNameKey` de outro id → 409 → `rename`/`changePixKey` → save |
| `delete-person.use-case.ts` | `{personId}` | `void` | 400 id, 404, 409 P4 (`countMemberships > 0`) |

**`modules/groups/application/use-cases/`**
| Arquivo | Input | Output | execute() / erros |
|---|---|---|---|
| `update-group.use-case.ts` (novo) | `{groupId; name: string}` | `GroupDetailOutput` | 400 VO/id, 404 → `rename` → save |
| `add-member.use-case.ts` (alterado; deps `GroupRepository`, `PersonRepository`, `Clock`) | `{groupId; personId?: string; name?: string; pixKey?: string\|null}` | `GroupDetailOutput` | regra G3, depois `group.addMember(person)` (G4). Se criar pessoa, salva a Person antes do Group (ver Riscos) |
| `get-dashboard.use-case.ts` (novo; deps `GroupRepository`, `PersonRepository`, `Clock`) | `{}` | `DashboardOutput` | regras D1–D4, calculadas em memória a partir de `findAll()` + `settle()` |
| demais (11) | inalterados | `GroupDetailOutput`/`SettlementOutput` | `remove-member` segue a G5 |

## Prisma (`api/prisma/schema.prisma`)
```prisma
model Person {
  id               String               @id
  name             String
  nameKey          String               @unique
  pixKey           String?
  createdAt        DateTime
  memberships      GroupMember[]
  paid             Expense[]
  shares           ExpenseParticipant[]
  paymentsSent     Payment[]            @relation("PaymentFrom")
  paymentsReceived Payment[]            @relation("PaymentTo")
}

model GroupMember {
  groupId  String
  personId String
  position Int
  group    Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  person   Person @relation(fields: [personId], references: [id], onDelete: Restrict)
  @@id([groupId, personId])
  @@index([personId])
}
```
- `Group.members GroupMember[]`. O model `Member` deixa de existir.
- `Expense.payer`, `ExpenseParticipant.member` e `Payment.from/to` passam a referenciar `Person` com `onDelete: Restrict`. Os nomes das colunas não mudam (`payerId`, `memberId`, `fromId`, `toId`). Despesas e pagamentos continuam em cascata a partir de `Group`. O domínio garante que esses ids sejam membros.
- `group.mapper.ts`: `members: { orderBy: {position:'asc'}, include: { person: true } }`. O `save` grava só `GroupMember` (`groupId, personId, position`) e não escreve nome nem PIX. A ordem continua: apaga payments, expenses e members, depois recria members, expenses e payments.

**Dados existentes: reset documentado.** O projeto não tem migrations e usa `db push`. Migrar `Member → Person+GroupMember` exigiria várias etapas (coluna nula, backfill, drop) que o `db push` não orquestra. Os dados são de desenvolvimento. Por isso:
- `api/package.json`: novo script `"db:reset": "node scripts/ensure-env.js && prisma generate && prisma db push --force-reset"`.
- `api/scripts/e2e.js`: `prisma db push --force-reset --skip-generate` (o banco de e2e é isolado).
- O README ganha a nota "após atualizar para a spec 003, rode `npm --prefix api run db:reset` (apaga os dados)".

## Contrato HTTP
**Novos**
| Método/rota | Body | Resposta |
|---|---|---|
| `POST /people` | `{name: string, pixKey?: string\|null}` | 201 `Person` |
| `GET /people` | — | 200 `PersonSummary[]` = `Person & {groupCount}` |
| `GET /people/:id` | — | 200 `PersonDetail` = `Person & {groups: {id,name,createdAt,memberCount,totalCents}[]}` |
| `PATCH /people/:id` | `{name?: string, pixKey?: string\|null}` | 200 `Person` |
| `DELETE /people/:id` | — | 204 |
| `PATCH /groups/:id` | `{name: string}` | 200 `GroupDetail` |
| `GET /dashboard` | — | 200 `Dashboard` |

`Person = {id, name, pixKey: string|null, createdAt: string}`.

```ts
type Dashboard = {
  totals: { spentCents: number; settledCents: number; pendingCents: number;
            groupCount: number; peopleCount: number; expenseCount: number };
  groupsByStatus: { settled: number; pending: number; empty: number };
  byGroup:   { groupId: string; name: string; totalCents: number }[];   // ≤ 8
  topPayers: { personId: string; name: string; paidCents: number }[];   // ≤ 5
  byMonth:   { month: string /* YYYY-MM */; totalCents: number }[];     // 6 itens, do mais antigo ao mais recente
};
```

**Alterados**
- `POST /groups/:id/members`: o body passa a ser `{personId?: string, name?: string, pixKey?: string|null}` (regra G3). A resposta continua 201 `GroupDetail`. **É compatível:** o formato `{name, pixKey?}` continua funcionando.
- `GroupDetail.members[].id` e `Balance.memberId`/`Transfer.fromId|toId`: o formato não muda, mas o **valor agora é o `personId`**. O web usa esse id para linkar `/people/[id]`.
- Todos os outros endpoints ficam iguais.

**DTOs (class-validator, `whitelist` + `forbidNonWhitelisted`)**: `CreatePersonDto`, `UpdatePersonDto` (`IsOptional`; `pixKey` com `ValidateIf(v => v !== null)` + `IsString`), `UpdateGroupDto` (`IsString`), `AddMemberDto` (todos `IsOptional`; a regra de "exatamente um formato" fica no use case).

## Impacto por camada (API)
- **shared/**: `domain/clock.port.ts` (movido), `domain/value-objects/text.ts` (movido) e `infrastructure/shared.module.ts` (`@Global`, provê e exporta `PrismaService` e `CLOCK`). O `app.module.ts` importa `SharedModule`, `PeopleModule` e `GroupsModule`.
- **people/**: `domain/{person.entity,person.repository}.ts`, `domain/value-objects/{person-name,pix-key}.vo.ts`, `application/use-cases/` (5), `application/dto/person.output.ts`, `infrastructure/{prisma-person.repository,person.mapper,in-memory-person.repository}.ts`, `presentation/{people.controller.ts,dto/{create-person,update-person}.dto.ts}` e `people.module.ts` (exporta `PERSON_REPOSITORY`).
- **groups/**: alterar `group.aggregate.ts`, `member.entity.ts`, `group.repository.ts` (+`findAll`), `group.mapper.ts`, `prisma-group.repository.ts`, `in-memory-group.repository.ts`, `add-member.use-case.ts`, `groups.controller.ts` (+`PATCH`), `groups.module.ts` (importa `PeopleModule`) e `testing/fixtures.ts`. Criar `update-group.use-case.ts`, `get-dashboard.use-case.ts`, `application/dto/dashboard.output.ts`, `presentation/dashboard.controller.ts` e `presentation/dto/update-group.dto.ts`. Remover `member-name.vo.ts` e `pix-key.vo.ts` de groups.

## Impacto no web
**Rotas** (route group `(app)` com o shell; as URLs não mudam)
```
app/layout.tsx                 html/body, skip link, tema (sem header/footer)
app/(app)/layout.tsx           <AppShell> (variação A)
app/(app)/page.tsx             Dashboard
app/(app)/groups/page.tsx      lista + form "Novo rolê" (#novo)    actions.ts: createGroupAction (redirect /groups/[id])
app/(app)/groups/[id]/layout.tsx   cabeçalho (nome, total, nº pessoas, link Editar) + <GroupTabs>
app/(app)/groups/[id]/page.tsx           Visão geral: KPIs + saldos + CTA "Ver acerto"
app/(app)/groups/[id]/expenses/page.tsx  form + lista de despesas
app/(app)/groups/[id]/settlement/page.tsx WhatsApp + transferências + pagamentos registrados
app/(app)/groups/[id]/members/page.tsx   participantes (link /people/[id]) + adicionar existente + criar inline + remover
app/(app)/groups/[id]/edit/page.tsx      renomear + "Zona de perigo" (excluir rolê)
app/(app)/groups/[id]/{actions.ts,loading,error,not-found}.tsx   (movidos)
app/(app)/people/page.tsx      lista (nome, PIX, nº rolês) + botão "Nova pessoa"
app/(app)/people/new/page.tsx
app/(app)/people/[id]/page.tsx       dados + rolês dela + Editar/Excluir
app/(app)/people/[id]/edit/page.tsx
app/(app)/people/{actions.ts}, people/[id]/not-found.tsx ("Essa pessoa sumiu do mapa")
app/sugestoes/page.tsx, a/page.tsx, b/page.tsx, c/page.tsx  (fora do (app); cada uma renderiza o próprio shell)
```
Remover `app/page.tsx` antigo, `app/actions.ts` e `app/groups/**` (movidos).

**lib**
- `types.ts`: `Person`, `PersonSummary`, `PersonDetail`, `UpdatePersonInput`, `AddMemberInput = {personId} | {name; pixKey?}` e `Dashboard`.
- `api.ts`: `updateGroup(id,name)`, `addMember(groupId, AddMemberInput)`, `listPeople`, `getPerson`, `createPerson`, `updatePerson`, `deletePerson` e `getDashboard`.
- `queries.ts` (`server-only`): `getGroup`/`getSettlement` embrulhados em `React.cache` e `loadGroupOr404(id)` (400/404 → `notFound()`). Layout e páginas do rolê compartilham a mesma requisição.
- `validation.ts`: `personSchema {name, pixKey}`, `addExistingMemberSchema {groupId, personId}` e `newMemberSchema` (o atual `memberSchema`).
- `charts.ts`: funções puras `niceMax`, `barLayout`, `donutArcs` e `linePath` (pontos e path `d`), com testes em vitest.

**Actions**: todas as mutações chamam `revalidatePath('/', 'layout')`.
- groups: `createGroupAction` e `updateGroupAction` (redirect para `/groups/[id]`).
- `[id]`: os atuais + `addExistingMemberAction` e `addNewMemberAction`, que substituem o `addMemberAction`. `deleteGroupAction` faz redirect para `/groups`.
- people: `createPersonAction`, `updatePersonAction` (redirect para `/people/[id]`) e `deletePersonAction` (redirect para `/people`, com erro 409 exibido).

**Componentes** (`web/features/`)
- `shell/`: `AppShell` (grid `md:grid-cols-[16rem_1fr]`), `Navbar` (logo, botão menu `md:hidden`, CTA "Novo rolê" → `/groups#novo`), `Sidebar` + `SidebarNav` (client; `usePathname`, `aria-current="page"`; itens Dashboard 📊 `/`, Rolês 🎉 `/groups`, Pessoas 🙋 `/people`), `MobileNav` (client; `<dialog>` com `showModal`, fecha com Esc, clique fora e mudança de rota, e devolve o foco ao botão), `Footer` e `nav-items.ts`.
- `groups/GroupTabs` (client; Visão geral, Despesas, Acerto, Pessoas, com `aria-current`) e `groups/EditGroupForm`.
- `members/AddExistingMemberForm` (`<select>` com as pessoas que ainda não estão no rolê; o estado vazio leva para "criar nova") e `members/AddMemberForm` (criar inline, reaproveitado).
- `people/PersonForm` (criar/editar; `pixKey` vazio limpa a chave) e `people/PersonCard`.
- `charts/BarChart` (horizontal), `charts/DonutChart` e `charts/LineChart`: **Server Components, só SVG**, `<figure>` + `<svg role="img" aria-labelledby>` + `<figcaption>`, uma `<table class="sr-only">` com os dados e estado vazio. Uso no dashboard: KPIs (gasto total, pendente, quitado, rolês, pessoas), rosca "Pendente × Quitado", barras "Gasto por rolê", barras "Quem mais pagou" e linha "Gastos por mês".

**Sugestões de layout** (todo arquivo começa com `// TODO(remover-apos-escolha)`)
- `app/sugestoes/{page,a/page,b/page,c/page}.tsx` e `features/sugestoes/{SuggestionBanner,ShellA,ShellB,ShellC,SampleDashboard,sample-data}.tsx|ts`. Os exemplos usam dados fictícios, sem depender da API.
  - **A**: sidebar fixa clássica (rótulos + ícones), navbar no topo e footer. É igual ao shell oficial.
  - **B**: sidebar recolhível só com ícones (botão alterna entre 4rem e 16rem, preferência em `localStorage`), com topbar e busca visual.
  - **C**: navegação principal em tabs no topo e sidebar contextual à direita (atalhos do rolê/pessoa). Sem sidebar global.
- `SuggestionBanner`: faixa fixa no topo com `role="note"`, texto **"SUGESTÃO — REMOVER APÓS A ESCOLHA"** e link "voltar às sugestões". O índice `/sugestoes` mostra cards A/B/C com prós e contras.
- O único ponto em arquivo oficial é o link "Sugestões de layout" no `Footer`, marcado com `{/* TODO(remover-apos-escolha) */}` na mesma linha.
- Remoção: `grep -rn "TODO(remover-apos-escolha)" web` → apagar os arquivos marcados e a linha do Footer. Se a escolha for B ou C, portar para `features/shell/` antes de apagar.

**Tema** (`globals.css`, um tema escuro único, sem `prefers-color-scheme`, `color-scheme: dark`)
| Token | Valor | Uso |
|---|---|---|
| `--bg-base` | `#0F141C` | fundo sólido do `html` (evita transparência sobre branco) |
| `--bg` | `rgb(37 45 60 / 0.70)` | `body` por cima da base (efetivo ≈ `#1E2632`). Sem pontilhado |
| `--surface` | `#1C2330` | cartões |
| `--surface-2` | `#252D3C` | inputs e áreas internas |
| `--line` / `--shadow` | `#333D50` / `#0B0F15` | bordas (essenciais, porque cartão e fundo têm luminância parecida) e sombra sticker |
| `--muted` | `#7A8497` | **texto corrido/secundário (cor pedida)**: ~4.2:1 sobre o cartão e ~4.0:1 sobre o fundo |
| `--muted-strong` | `#A3ACBD` | texto `xs`, hints, legendas de gráfico (~6.9:1) |
| `--ink` | `#E6EAF2` | títulos, valores, labels, inputs (≥ 12:1) |
| `--brand` / `--brand-hover` / `--brand-ink` | `#4F46E5` / `#4338CA` / `#FFFFFF` | `btn-primary` (6.3:1). **Nunca usar como cor de texto** |
| `--link` / `--focus` | `#A5B4FC` | links e anel de foco |
| `--accent` / `--accent-ink` | `#FFC24D` / `#1E1A2B` | destaques |
| `--pos` / `--pos-soft` | `#4ADE80` / `rgb(74 222 128 / .12)` | "recebe" (~9:1) |
| `--neg` / `--neg-soft` | `#F87171` / `rgb(248 113 113 / .12)` | "deve" e erros (~5.7:1) |
| `--chart-1..5` | `#818CF8 #4ADE80 #FFC24D #F87171 #38BDF8` | séries |

**Decisão registrada:** `#7A8497` fica abaixo de AA (4.5:1) para texto pequeno. Ele é mantido por pedido explícito, mas só em texto ≥ 14px. Títulos e valores usam `--ink`, e texto `xs` usa `--muted-strong`. O `viewport.themeColor` passa a ser `#1E2632`. O `DESIGN.md` é atualizado: conceito "sticker" adaptado ao escuro, tokens acima, shell, gráficos e sugestões.

## Tarefas e critérios de aceite

### Parte Backend
- **B1. VOs, shared e Person.** Mover `MemberName→PersonName` (+`key`), `PixKey`, `text.ts` e `Clock`. Criar a entidade `Person`, a porta e o repositório in-memory, além de `SharedModule`.
  - AC: specs dos VOs passam com as mesmas mensagens. `PersonName.create(' Ána ').key === 'ána'`. `rename`/`changePixKey` funcionam. Nenhum arquivo em `domain/` ou `application/` importa Nest ou Prisma.
- **B2. Use cases de people + controller + Prisma.**
  - AC (unit): criar "Ana" e depois " ANA " → 409 P1. Renomear "Ana" para "ANA" (ela mesma) → ok. Renomear para o nome de outra pessoa → 409. PATCH `{}` → 400 P3. `pixKey: null` limpa. Excluir uma pessoa com vínculo → 409 P4. id `x` → 400. UUID inexistente → 404.
  - AC (e2e): `POST /people` 201. `GET /people` traz `groupCount` correto e vem ordenado por nome. `GET /people/:id` lista os rolês. `PATCH` muda o nome e o `GET /groups/:gid` e o settlement mostram o novo nome. `DELETE` sem vínculo → 204, com vínculo → 409. Campo extra → 400.
- **B3. Schema e mapper do Group.** `Person`/`GroupMember`, FKs para Person, mapper, `save`, `db:reset` e `e2e.js --force-reset`.
  - AC: `prisma validate` passa. Excluir um rolê (204) mantém as pessoas (`GET /people/:id` → 200, `groupCount` decrementado).
- **B4. Aggregate + add/remove member + update group.**
  - AC (unit): `addMember` da mesma pessoa duas vezes → 409 G4. Cada combinação inválida da G3 → 400 com a mensagem exata. `{name}` existente sem `pixKey` → reaproveita o mesmo `personId`. Com `pixKey` diferente → 409. Rolê inexistente com `{name:'X'}` → 404 **e nenhuma pessoa é criada**. `rename` valida `GroupName`.
  - AC (e2e): a suíte atual passa sem alterar asserções de negócio. "Ana" em vários rolês é a mesma pessoa (mesmo id). O teste de nome duplicado continua 409. A mesma pessoa em 2 rolês tem saldos independentes. `PATCH /groups/:id {name:''}` → 400, `{name:'Praia'}` → 200 com o nome novo. Remover o membro preserva a Person.
- **B5. Dashboard.** `findAll`, `get-dashboard.use-case.ts`, `GET /dashboard`.
  - AC (unit, clock fixo em 2026-11-10 e despesas em 2026-06-30T23:30-03:00 e 2026-11-01): `byMonth` tem 6 itens de `2026-06` a `2026-11`, e a despesa de 30/06 às 23:30 BRT cai em `2026-06`. Com o cenário Ana/Bia/Cadu da spec 002 + pagamento Cadu→Ana 1500: `spentCents 12000`, `settledCents 1500`, `pendingCents 3500`, `topPayers[0] = Ana 9000`. Um rolê vazio conta em `groupsByStatus.empty`, e `byGroup` traz no máximo 8 itens sem rolês zerados.
  - AC (e2e): `GET /dashboard` → 200 com o formato do contrato. Com o banco vazio, tudo vem 0 e as listas vêm vazias (`byMonth` continua com 6 itens).
- **Geral:** `npm run test`, `typecheck`, `lint` e `test:e2e` (api) passam.

### Parte Frontend (depois que o backend estiver pronto)
- **F1. Tema.** `globals.css` com os tokens acima e `DESIGN.md` atualizado.
  - AC: não sobra nenhum `prefers-color-scheme`. O `html` tem fundo `#0F141C`. `btn-primary` é `#4F46E5` com texto branco. `.card` é `#1C2330`. O texto padrão do body é `--muted`. Os `h1`–`h3` e valores usam `--ink`. O foco fica visível em todos os controles.
- **F2. Shell (variação A).** Route group `(app)`, Navbar, Sidebar, MobileNav (drawer) e Footer.
  - AC: com viewport ≥ md a sidebar fica visível e o item ativo tem `aria-current="page"`. Com < md a sidebar some, o botão "Menu" abre o `<dialog>` com os 3 itens, o Esc fecha e o foco volta ao botão, e navegar fecha o drawer. O skip link funciona. Todas as rotas antigas continuam respondendo (`/groups/[id]`).
- **F3. Rolês.** `/groups` (lista + criar → redirect para o detalhe), sub-rotas do detalhe, `edit` e `queries.ts`.
  - AC: nenhum arquivo de página passa de ~150 linhas. As tabs marcam a sub-rota atual. Criar despesa, registrar e desfazer pagamento, e remover pessoa funcionam nas novas sub-rotas, com os erros da API exibidos via `FormError`. Renomear atualiza o cabeçalho. Excluir o rolê faz redirect para `/groups`. Um id inválido mostra o not-found.
- **F4. Pessoas.** `/people`, `/people/new`, `/people/[id]` e `/people/[id]/edit`, mais adicionar existente ou criar inline em `/groups/[id]/members`.
  - AC: criar uma pessoa com nome duplicado mostra a mensagem 409 e preserva o que foi digitado. O select de "adicionar existente" não lista quem já está no rolê. O nome do membro linka para `/people/[id]`. Editar o PIX aparece no acerto do rolê. Excluir uma pessoa vinculada mostra o erro 409.
- **F5. Dashboard.** `/` com os KPIs e os 4 gráficos. `lib/charts.ts` testado.
  - AC (vitest): `niceMax(0)` > 0 (não divide por zero). `donutArcs` com uma fatia zerada não gera path inválido (`NaN`). `donutArcs` com 100% numa fatia gera um círculo completo. `linePath` com 6 pontos gera um `d` começando em `M`. Na UI, cada gráfico tem `role="img"`, um `aria-label` descritivo e uma tabela `sr-only`, e o banco vazio mostra estado vazio com copy simpática.
- **F6. Sugestões.** `/sugestoes`, `/sugestoes/a`, `/b` e `/c`.
  - AC: as 4 páginas renderizam sem API, com o banner "SUGESTÃO — REMOVER APÓS A ESCOLHA" visível. `grep -rl "TODO(remover-apos-escolha)" web` lista todos os arquivos de sugestão + o `Footer`. Apagar esses arquivos e a linha do Footer mantém `typecheck` e `build` verdes. Na B, recolher a sidebar persiste após recarregar.
- **Geral:** `npm run typecheck`, `lint`, `test` e `build` (web) passam. Os testes atuais de `money`/`whatsapp` continuam verdes.

## Riscos e dependências
- **Breaking de dados:** é preciso rodar `db:reset`, o que apaga os dados de dev. Se alguma instância publicada (imagem no Docker Hub) tiver dados reais, seria necessário um script de migração `Member→Person` (fora de escopo). Sinalizar ao usuário antes de publicar.
- **Semântica de ids:** `members[].id` passa a ser o `personId`. O formato não muda, mas os links e ids antigos guardados deixam de valer.
- **Atomicidade em G3 (criar inline):** a Person é salva antes do Group, em transações separadas. Se o `save` do Group falhar, o use case compensa e remove a pessoa recém-criada (pessoas que já existiam não são tocadas). O rolê inexistente é checado antes, para evitar o caso comum.
- **Dashboard em memória** (`findAll`): é O(total de dados), aceitável no volume atual. Um read model SQL fica como evolução futura.
- **Dependência entre módulos** `groups → people`, que exporta `PERSON_REPOSITORY`. `people` não pode importar `groups`. Os dados de rolê em `getDetail` vêm de uma consulta Prisma na infraestrutura de people.
- **Contraste do `#7A8497`:** fica abaixo de AA em texto pequeno. A mitigação está na tabela de tokens.
- Ordem: B1→B5 (cada passo com testes verdes), depois F1→F6. O F6 pode ser feito em paralelo ao F3–F5, depois do F1/F2.
