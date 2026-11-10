# Spec 002 — Pagamentos registrados + adequação às diretrizes de backend

## Objetivo
- **A)** Reestruturar `api/` conforme `.claude/agents/backend-dev.md`: módulo `groups`, VOs, `UniqueEntityId` (UUID v4), entidades com `create()`/`restore()` e um Use Case por arquivo, **sem quebrar o contrato HTTP** usado pelo `web/`.
- **B)** Permitir registrar pagamento (total ou parcial) de uma dívida e desfazê-lo; o acerto passa a mostrar só o que falta pagar.

## Regras de negócio
1. Saldo por membro: `balance = paidCents − owedCents + sentCents − receivedCents` (pagamentos enviados aumentam o saldo de quem paga e diminuem o de quem recebe). Σ balances = 0.
2. Transferências sugeridas: mesmo algoritmo guloso atual, aplicado aos saldos acima. `pixPayload` é gerado com o valor restante. `totalCents` continua sendo só a soma das despesas.
3. `Group.registerPayment(from, to, amount, createdAt)`, checado nesta ordem:
   1. `from == to` → 400 `Quem paga e quem recebe precisam ser pessoas diferentes`
   2. `from` ou `to` não é membro → 400 `Quem paga e quem recebe precisam ser pessoas do rolê`
   3. saldo atual de `from` ≥ 0 → 400 `<Nome> não tem saldo devedor neste rolê`
   4. saldo atual de `to` ≤ 0 → 400 `<Nome> não tem valor a receber neste rolê`
   5. `amount > min(|saldo from|, saldo to)` → **409** `Valor acima do devido: o máximo para este pagamento é R$ X,XX` (`X,XX` = `Money.toDecimalString()` com vírgula)
   - Pagamento entre qualquer par devedor→credor é aceito, não só os pares sugeridos.
4. `removePayment(id)` sempre permitido. Se não existir → 404 `Pagamento não encontrado neste rolê`.
5. `removeMember`: além da regra atual (despesas → 409), membro que aparece em pagamento (from/to) → 409 `Não é possível remover uma pessoa com pagamento registrado`. A verificação de despesas vem antes (a mensagem atual é mantida).
6. `removeExpense` continua permitido mesmo com pagamentos. Os saldos podem inverter (quem pagou a mais vira credor) e o acerto sugere a devolução. Isso é intencional.
7. IDs: todo id (rota ou corpo) passa por `UniqueEntityId`. Valor não-UUID v4 → 400 `Identificador inválido`. UUID válido e inexistente → 404 (rolê/pessoa/despesa/pagamento). Exceção: em despesas e pagamentos, ids do corpo que são UUID válido mas não são membros continuam com 400 (mensagens atuais).
8. Todas as regras e mensagens atuais de `api/src/domain/group.ts` ficam iguais (ver VOs).

## Value Objects
`api/src/shared/domain/value-objects/unique-entity-id.vo.ts`
- `UniqueEntityId.create(value?: string)`: sem valor, gera com `randomUUID()`. Com valor, valida `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` e normaliza para minúsculas. Inválido ou outra versão → `ValidationError('Identificador inválido')`. Expõe `value`, `equals()` e `toString()`.

`api/src/modules/groups/domain/value-objects/` (todos com `static create(raw)` que lança `ValidationError` e `value` readonly)

| VO | Regra (igual à atual) | Mensagem |
|---|---|---|
| `GroupName` | string; trim; 1–60 | não-string: `Nome do rolê é obrigatório`; tamanho: `Nome do rolê deve ter entre 1 e 60 caracteres` |
| `MemberName` | string; trim; 1–40; `equalsIgnoreCase(other)` via `toLocaleLowerCase('pt-BR')` | `Nome da pessoa ...` (mesmo padrão) |
| `PixKey` | `PixKey.createOptional(raw): PixKey \| null`. `undefined`/`null`/`''` após trim → `null`; não-string → `Chave PIX inválida`; >77 → `Chave PIX deve ter no máximo 77 caracteres`; fora de `^[\x21-\x7E]+$` → mensagem atual (sem espaços/acentos) | — |
| `ExpenseDescription` | string; trim; 1–80 | `Descrição ...` (mesmo padrão) |
| `AmountCents` | `Number.isSafeInteger`, 1..100_000_000 (despesa e pagamento) | `Valor deve ser um inteiro de centavos entre 1 e 100000000` |
| `Weight` | `Weight.create(raw?: number)`: `undefined` → 1; inteiro 1–100 | `Peso deve ser inteiro entre 1 e 100` |
| `Money` | já existe (≥0, `toDecimalString`), só é movido. Usado em pix/saldos | atual |

## Impacto por camada (API)
- **shared/**: `domain/errors/` (`domain-error.ts`, `validation.error.ts`, `not-found.error.ts`, `conflict.error.ts`, `index.ts`; mesma API com `kind`); `domain/value-objects/unique-entity-id.vo.ts`; `infrastructure/prisma.service.ts` (movido); `presentation/all-exceptions.filter.ts` (movido, sem mudar o comportamento).
- **domain/** (`modules/groups/domain/`):
  - `entities/member.entity.ts`: `create({name, pixKey}, id?)`, `restore({id,name,pixKey})`.
  - `entities/expense.entity.ts`: `create({description, amount, payerId, participants:{memberId,weight}[], createdAt}, id?)`, `restore`, `shares()` (usa o split).
  - `entities/payment.entity.ts`: `create({fromId,toId,amount,createdAt}, id?)` (from≠to → 400), `restore`, `involves(memberId)`.
  - `group.aggregate.ts` (raiz): `create({name}, createdAt, id?)`, `restore(snapshot)`, `addMember`, `removeMember`, `addExpense`, `removeExpense`, `registerPayment`, `removePayment`, `balances()`, `settle()`, getters `members/expenses/payments/totalCents`. Recebe VOs/`UniqueEntityId`, faz as invariantes entre entidades (membro existe, duplicidade de nome, participantes repetidos → `Participantes repetidos`, etc.).
  - `services/split.service.ts`, `services/settlement.service.ts` (`computeBalances(members, expenses, payments)` adiciona `sentCents`/`receivedCents`), `services/pix.service.ts`: funções puras movidas.
  - `group.repository.ts`: porta `GroupRepository { findById(id: UniqueEntityId); listSummaries(); save(group); delete(id: UniqueEntityId): boolean }` + tipo `GroupSummary` + token `GROUP_REPOSITORY`. `clock.port.ts`: `Clock` + `CLOCK`. **`IdGenerator` é removido.**
- **application/** (`modules/groups/application/`): `use-cases/*.use-case.ts` (abaixo) e `dto/group-detail.output.ts` e `dto/settlement.output.ts` (tipos + mappers `toGroupDetailOutput(group)` e `toSettlementOutput(group)`, que substituem `views.ts`). Sem Nest e sem Prisma.
- **infrastructure/**: `prisma-group.repository.ts` + `group.mapper.ts` (row ⇄ aggregate). Ordem do `save`: deleta payments → expenses → members, recria members → expenses → payments (com `position`). `in-memory-group.repository.ts` (para testes unitários).
- **presentation/**: `groups.controller.ts` (injeta cada Use Case pela classe), DTOs existentes + `register-payment.dto.ts`. `groups.module.ts` registra `PrismaService`, `{provide: GROUP_REPOSITORY, useClass: PrismaGroupRepository}`, `{provide: CLOCK, useValue}` e cada Use Case via `useFactory`/`inject`. `app.module.ts` só importa `GroupsModule`. `bootstrap.ts` importa o filtro de `shared/`.
- **Prisma**: model `Payment` (abaixo). Aplicado com `prisma db push`, que também roda no `test:e2e`.

## Use Cases (`modules/groups/application/use-cases/`)
Deps: `repo: GroupRepository` e, quando há timestamp, `clock: Clock`. Cada um tem só `execute()`. Ids recebidos como string → `UniqueEntityId.create(x)` (400 se inválido). Rolê ausente → 404 `Rolê não encontrado`. `GroupDetailOutput`/`SettlementOutput` = contratos HTTP abaixo.

| Arquivo | Input | Output | Erros |
|---|---|---|---|
| `create-group.use-case.ts` | `{name: string}` | `GroupDetailOutput` | 400 nome |
| `list-groups.use-case.ts` | `{}` | `GroupSummaryOutput[]` (createdAt ISO, desc) | — |
| `get-group.use-case.ts` | `{groupId}` | `GroupDetailOutput` | 400 id, 404 |
| `delete-group.use-case.ts` | `{groupId}` | `void` | 400 id, 404 |
| `add-member.use-case.ts` | `{groupId, name, pixKey?: string\|null}` | `GroupDetailOutput` | 400 VO, 404, 409 nome duplicado |
| `remove-member.use-case.ts` | `{groupId, memberId}` | `GroupDetailOutput` | 400 id, 404 rolê/pessoa, 409 despesa/pagamento |
| `add-expense.use-case.ts` | `{groupId, description, amountCents, payerId, participants:{memberId, weight?}[]}` | `GroupDetailOutput` | 400 VO/membro/repetido, 404 |
| `remove-expense.use-case.ts` | `{groupId, expenseId}` | `GroupDetailOutput` | 400 id, 404 rolê/despesa |
| `get-settlement.use-case.ts` | `{groupId}` | `SettlementOutput` | 400 id, 404 |
| `register-payment.use-case.ts` | `{groupId, fromId, toId, amountCents}` | `GroupDetailOutput` | 400 (regra 3.1–3.4, id, AmountCents), 404 rolê, 409 acima do devido |
| `remove-payment.use-case.ts` | `{groupId, paymentId}` | `GroupDetailOutput` | 400 id, 404 rolê/pagamento |

Fluxo padrão de mutação: valida ids/VOs → `repo.findById` → método do aggregate → `repo.save` → `toGroupDetailOutput`.

## Contratos HTTP (rotas atuais inalteradas, mais 2 novas)
- `GroupDetail` ganha `payments: { id; fromId; toId; amountCents; createdAt: string }[]`, do mais recente para o mais antigo. Os demais campos ficam iguais.
- `SettlementView.balances[]` ganha `sentCents` e `receivedCents`. `balanceCents` segue a regra 1. Os demais campos ficam iguais.
- `POST /groups/:id/payments` body `{fromId: string, toId: string, amountCents: int}` (DTO: `IsString`/`MinLength(1)` nos ids, `IsInt Min(1) Max(100_000_000)` no valor; `whitelist`/`forbidNonWhitelisted` como hoje) → **201** `GroupDetail`.
- `DELETE /groups/:id/payments/:paymentId` → **200** `GroupDetail`.
- Corpo de erro inalterado: `{statusCode, message, error}`.

## Prisma (`api/prisma/schema.prisma`)
```prisma
model Payment {
  id          String   @id
  groupId     String
  fromId      String
  toId        String
  amountCents Int
  createdAt   DateTime
  position    Int
  group       Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  from        Member   @relation("PaymentFrom", fields: [fromId], references: [id], onDelete: Cascade)
  to          Member   @relation("PaymentTo", fields: [toId], references: [id], onDelete: Cascade)
  @@index([groupId])
}
```
`Group.payments Payment[]`; `Member.paymentsSent Payment[] @relation("PaymentFrom")` e `paymentsReceived Payment[] @relation("PaymentTo")`. Também usar `onDelete: Cascade` em `Expense.payer` e `ExpenseParticipant.member`. A remoção de membro já é protegida pelo domínio, e isso evita o SQLite barrar (RESTRICT) a exclusão de um rolê com dados.

## Web (feito pelo orquestrador)
- `lib/types.ts`: `Payment`; `GroupDetail.payments`; `Balance.sentCents/receivedCents`; `RegisterPaymentInput`.
- `lib/api.ts`: `registerPayment(groupId, input)` e `removePayment(groupId, paymentId)`.
- `app/groups/[id]/actions.ts`: `registerPaymentAction` (zod: `groupId/fromId/toId` com `idSchema`, `amountCents` de `parseMoneyToCents(str(fd,'amount'))` inteiro positivo ≤ `MAX_AMOUNT_CENTS`, refine from≠to) e `removePaymentAction` (`pairSchema` com `paymentId`). Ambas usam `run()`.
- `features/settlement/RegisterPaymentForm.tsx` (client, `useFormAction`): hidden `groupId/fromId/toId`, input `amount` com `defaultValue` = total formatado `"40,00"`, botão `btn btn-primary` "Registrar pagamento" e erro via `FormError`.
- `TransferCard` recebe `groupId` + `registerAction` e renderiza o form. No `page.tsx`, usar a key `${fromId}-${toId}-${amountCents}` para resetar o valor pré-preenchido após um pagamento parcial.
- `page.tsx`: seção "Pagamentos registrados" dentro do Acerto (quando `payments.length > 0`), com "De → Para", valor, data e `ActionButton` "Desfazer" (`removePaymentAction`). O set `involved` passa a incluir from/to de pagamentos (cadeado "em despesas/pagamentos"). O card de saldo mostra "enviou/recebeu" quando ≠ 0.
- `lib/whatsapp.ts`: sem mudança de lógica, porque `transfers` já é o restante. Testes atuais continuam passando.

## Arquivos
**Criar (api/src):** `shared/domain/errors/{domain-error,validation.error,not-found.error,conflict.error,index}.ts`, `shared/domain/value-objects/unique-entity-id.vo.ts(+spec)`, `shared/infrastructure/prisma.service.ts`, `shared/presentation/all-exceptions.filter.ts`, `modules/groups/groups.module.ts`, `modules/groups/domain/{group.aggregate,group.repository,clock.port}.ts`, `domain/entities/{member,expense,payment}.entity.ts`, `domain/value-objects/{group-name,member-name,pix-key,expense-description,amount-cents,weight,money}.vo.ts`, `domain/services/{split,settlement,pix}.service.ts`, `application/use-cases/` (11 arquivos), `application/dto/{group-detail,settlement}.output.ts`, `infrastructure/{prisma-group.repository,group.mapper,in-memory-group.repository}.ts`, `presentation/groups.controller.ts`, `presentation/dto/{create-group,add-member,add-expense,register-payment}.dto.ts`. Specs `*.spec.ts` ao lado (VOs, entidades, aggregate, services, cada use case).
**Remover:** `api/src/{domain,application,infrastructure,presentation}/**` (antigos).
**Alterar:** `api/src/app.module.ts`, `api/src/bootstrap.ts`, `api/prisma/schema.prisma`, `api/test/app.e2e-spec.ts`; no web, os arquivos listados acima.

## Critérios de aceite
1. `UniqueEntityId`: gera um v4 válido quando omitido; aceita v4 (maiúsculo é normalizado); rejeita `'nao-existe'`, `''` e um UUID v1/v7 com `ValidationError`.
2. Cada VO aceita os limites (1 e máx) e rejeita 0/máx+1 com as mensagens da tabela. `PixKey` `'  '` → `null`, `'a b'` → erro. `Weight` `undefined` → 1.
3. Nenhum arquivo em `domain/` ou `application/` importa `@nestjs/*` ou `@prisma/*`. Não existe mais a classe `GroupUseCases`. Cada Use Case tem só `execute()` público e teste unitário com repositório in-memory.
4. E2E, cenário atual (Ana paga 9000, Bia 3000, três dividem; saldos `[5000,-1000,-4000]`): todas as asserções atuais passam, exceto as de 404 com `'nao-existe'`, que viram **400**. Os 404 passam a usar `randomUUID()` (rolê, pessoa, despesa, pagamento).
5. `POST /payments` Cadu→Ana 1500 → 201; `payments[0]` = `{fromId:Cadu, toId:Ana, amountCents:1500}`. O settlement passa a dar balances `[3500,-1000,-2500]`, Cadu com `sentCents:1500` e Ana com `receivedCents:1500`, transfers `[Cadu→Ana 2500, Bia→Ana 1000]`, e o `pixPayload` contém `540525.00`.
6. Cadu→Ana 2600 → 409 com a mensagem "Valor acima do devido…". Cadu→Cadu → 400. Bia→Cadu → 400 (Cadu não é credor). `amountCents: 0` ou `10.5` → 400. `fromId: 'x'` → 400. Campo extra → 400.
7. Cadu→Ana 2500 e Bia→Ana 1000 → `transfers: []`. A lista `payments` vem do mais recente para o mais antigo.
8. `DELETE /payments/:pid` → 200, e o settlement volta a ter a transferência correspondente. Com pid inexistente (UUID) → 404; com pid não-UUID → 400.
9. Com pagamento envolvendo Cadu e sem despesas dele → `DELETE /members/:cadu` dá 409. Após desfazer o pagamento → 200.
10. Remover despesa com pagamentos registrados → 200, e os saldos refletem a regra 6.
11. `DELETE /groups/:id` de um rolê com despesas e pagamentos → 204 e o GET seguinte → 404.
12. `npm run test`, `npm run typecheck`, `npm run lint` e `npm run test:e2e` (api) passam. No web, `typecheck`/`lint`/`test` passam e a página registra pagamento parcial com o valor editável.

## Riscos e dependências
- **Breaking leve:** ids não-UUID agora retornam 400 em vez de 404. O web já trata 400 como `notFound()`. Os ids atuais no `dev.db` são `randomUUID()` (v4), então continuam compatíveis.
- **Schema:** `db push` cria a tabela `Payment` e redefine FKs (cascade) no SQLite sem perda de dados. Rodar `npm run db:setup` no dev. Não há migrations.
- **Ordem no `save`:** é preciso apagar payments antes de members, senão a FK falha.
- **Grande movimentação de arquivos:** fazer a parte A (refatoração com e2e verde) antes da B, em commits separados.
- O frontend depende dos novos campos (`payments`, `sentCents`/`receivedCents`) e só deve ser feito depois que a API estiver pronta.
