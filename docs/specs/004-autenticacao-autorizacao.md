# Spec 004: Autenticação, papéis de usuário, rolês por dono e convites

## Objetivo
1. **Login obrigatório.** A API exige `Authorization: Bearer <JWT>` em tudo, exceto `POST /auth/login` e `GET /health`. O web redireciona para `/login` quando não há sessão.
2. **Dois papéis de usuário:** `USER` e `ADMIN`. O admin tem acesso total e é o único que cria usuários.
3. **Rolês por usuário.** "Rolê" aqui é o model `Group`, sem relação com RBAC. O usuário só vê os rolês que criou ou dos quais participa, e pode criar rolês.
4. **Convites.** Quem tem acesso a um rolê convida outro usuário. O convidado aceita (vira participante) ou recusa.
5. **Seed de demonstração:** `huguinho`, `luizinho` e `zezinho` (papel USER) e o `admin`.

Fora de escopo: ver a seção [Fora de escopo](#fora-de-escopo).

## Decisões de arquitetura (com justificativa)
- **D1. `User` 1:1 `Person`.** As despesas, os pagamentos e os membros de um rolê referenciam `Person` (spec 003). Vincular cada usuário a uma Person deixa o usuário participar de rolês sem mexer no modelo de despesas. Pessoas sem conta continuam existindo, para participantes que não usam o app.
- **D2. Sem dependências novas.** O hash de senha usa `node:crypto.scrypt` e o JWT HS256 usa `node:crypto.createHmac`. Os dois ficam atrás das portas `PasswordHasher` e `TokenService`, então trocar por bcrypt/argon2 ou `@nestjs/jwt` depois não toca no domínio. O escopo de JWT usado aqui (HS256, `exp`) é pequeno e cabe em ~60 linhas testáveis.
- **D3. Guard global (`APP_GUARD`) com opt-out `@Public()`.** Esquecer de proteger uma rota nova vira impossível (o padrão é negar).
- **D4. A autorização fica na camada de aplicação** (`GroupAccessPolicy` + `Actor` no Input dos Use Cases), não em guards do Nest. A regra depende do estado do rolê (dono, membros), e com isso os Use Cases continuam testáveis sem Nest.
- **D5. Rolê inacessível → 404, não 403.** Assim a API não revela que o rolê existe. O 403 fica para quem **vê** o rolê mas não pode gerenciá-lo (membro tentando renomear ou excluir) e para rotas de admin.
- **D6. O guard recarrega o usuário do banco a cada requisição** (`findById(sub)`). Papel alterado ou usuário removido no futuro passam a valer na hora, sem lista de revogação. O custo é 1 query por PK.
- **D7. Migration versionada** (`prisma migrate dev --name auth`). Produção já roda `migrate deploy` (`start.sh`). Os e2e continuam com `db push` no banco isolado.

## Regras de negócio
Mapeamento de erros: `ValidationError`→400, `UnauthorizedError`→401 (**novo**), `ForbiddenError`→403 (**novo**), `NotFoundError`→404, `ConflictError`→409. O corpo continua `{statusCode, message, error}` e o `AllExceptionsFilter` ganha `401: 'Unauthorized'` e `403: 'Forbidden'`. Ids continuam passando por `UniqueEntityId` (400 `Identificador inválido`).

**Autenticação**
- A1. `POST /auth/login {username, password}`: normaliza o username (trim + lowercase). Usuário inexistente, senha errada **ou username com formato inválido** → 401 `Usuário ou senha inválidos` (sempre a mesma mensagem). Quando o usuário não existe, o use case roda `hasher.verify` contra um hash fictício fixo, para igualar o tempo de resposta. Body sem os campos ou com tipo errado → 400 (DTO).
- A2. Token JWT HS256 com payload `{sub: userId, role, iat, exp}` e `exp = iat + 7 dias` (`Clock`). Resposta: `{accessToken, user: UserOutput}`.
- A3. Requisição sem header `Authorization` ou sem o prefixo `Bearer ` → 401 `Não autenticado`. Assinatura inválida, `alg` ≠ HS256, token malformado ou expirado, ou `sub` sem usuário no banco → 401 `Sessão expirada ou inválida`.
- A4. Rota com `@Roles('ADMIN')` acessada por um USER → 403 `Acesso negado`.
- A5. `JWT_SECRET`: com `NODE_ENV=production` é obrigatório e tem no mínimo 32 caracteres. Ausente ou curto → a API **não sobe** (erro no boot: `JWT_SECRET ausente ou curto (mín. 32) em produção`). Fora de produção, o default é `dev-only-insecure-jwt-secret-change-me`. Quem lê é a função pura `loadAuthConfig(env)` em `modules/auth/infrastructure/auth.config.ts`.

**Usuários**
- U1. Só o ADMIN cria e lista usuários (`POST/GET /users`).
- U2. `username`: VO `Username`, único. Guardado já normalizado (lowercase), então a unicidade é case-insensitive. Se já existir → 409 `Já existe um usuário "<username>"`. Um P2002 no `save` também vira esse 409.
- U3. `password`: VO `Password` (só para entrada, nunca persistido nem devolvido). Persiste apenas o `passwordHash`.
- U4. `role` é opcional e o default é `USER`.
- U5. **Person vinculada.** `name` é opcional (`PersonName`) e o default é o próprio username. Busca a Person por `nameKey`:
  - não existe → cria a Person (`pixKey` nulo) e o User aponta para ela;
  - existe e **sem** usuário → vincula;
  - existe e **já** tem usuário → 409 `A pessoa "<Nome>" já está vinculada a outro usuário`.
  Ordem: VOs → username livre (409) → Person (409) → salva a Person (se nova) → salva o User. Se o save do User falhar, o use case remove a Person recém-criada (mesma compensação da spec 003, G3).
- U6. `GET /users/search?q=` (qualquer autenticado): `q` tem trim e 2 a 30 caracteres, senão 400 `Informe de 2 a 30 caracteres para buscar`. Busca, sem diferenciar caixa, por *contains* em `username` ou no nome da Person. Exclui o próprio usuário, limita a 10 resultados e ordena por username asc.

**Acesso a rolês** (`GroupAccessPolicy`, funções puras sobre `Actor` + `Group`)
- R1. `canView(actor, group)` = `actor.role === 'ADMIN'` **ou** `group.ownerId === actor.userId` **ou** `group` tem um membro com `id === actor.personId`.
- R2. `canManage(actor, group)` = ADMIN **ou** dono. Vale para renomear (`PATCH /groups/:id`) e excluir (`DELETE /groups/:id`).
- R3. Toda rota `/groups/:id/**` carrega o rolê com `findAccessibleGroupOrFail(repo, id, actor)`, que substitui `findGroupOrFail`. Inexistente ou `!canView` → 404 `Rolê não encontrado`. Visível mas `!canManage` em R2 → 403 `Acesso negado`. A checagem roda **antes** de qualquer outra regra de negócio do rolê, mas depois da validação de ids e VOs, mantendo a ordem da spec 003.
- R4. Rolês antigos (`ownerId = null`) só aparecem para o admin, porque ninguém é dono e, em geral, ninguém tem Person com usuário entre os membros. Se uma Person membro for vinculada depois a um usuário (U5), esse usuário passa a vê-los. Isso é intencional e é coerente com R1.
- R5. `POST /groups`: `ownerId = actor.userId` e a Person do ator entra como **primeiro membro**.
- R6. `GET /groups` e `GET /dashboard` consideram só os rolês visíveis (`GroupScope`). O admin vê todos. No dashboard, `peopleCount` passa a ser o número de pessoas distintas nos rolês visíveis (admin: `people.count()`).
- R7. **Participante com conta exige convite.** `POST /groups/:id/members` (`{personId}` ou `{name}` reaproveitando uma pessoa existente, regra G3) com uma Person vinculada a um usuário → 409 `<Nome> tem conta no Racha Aí: envie um convite`. **Exceção: ADMIN** pode adicionar direto. *Justificativa:* sem isso, qualquer usuário colocaria outro num rolê sem consentimento e o fluxo de convite perderia o sentido.
- R8. `DELETE /groups/:id/members/:memberId` com a Person do **dono** → 409 `O dono do rolê não pode ser removido`. Isso é checado antes das regras G5. Remover outros membros continua permitido a quem vê o rolê. Um usuário removido perde o acesso.

**Convites**
- C1. `POST /groups/:id/invites` aceita **exatamente um** de `{userId}` ou `{username}`. Os dois ou nenhum → 400 `Informe o usuário a convidar`. Quem convida precisa ver o rolê (R3, 404).
- C2. Ordem das checagens: ids → rolê acessível (404) → convidado existe (404 `Usuário não encontrado`) → convidado é o próprio ator → 400 `Você não pode convidar a si mesmo` → convidado já vê o rolê por ser membro ou dono → 409 `<username> já participa deste rolê` → já existe convite PENDING para o mesmo `(groupId, inviteeId)` → 409 `Já existe um convite pendente para <username> neste rolê`.
- C3. Um convite recusado ou aceito não impede um novo convite depois.
- C4. `GET /invites`: só os convites **PENDING recebidos** pelo ator, por `createdAt desc`, com o nome do rolê e o username/nome de quem convidou.
- C5. `POST /invites/:id/accept` e `/decline`: convite inexistente **ou de outro usuário** (`inviteeId ≠ actor.userId`, inclusive para o ADMIN) → 404 `Convite não encontrado`. Status ≠ PENDING → 409 `Este convite já foi respondido`.
- C6. Aceitar: `group.addMember(person do convidado)`. Se ele já for membro (adicionado por um admin no meio do caminho), não é erro: só marca ACCEPTED. Ordem: salva o Group, depois salva o Invite (`status`, `respondedAt = clock.now()`). Repetir a operação depois de uma falha entre os dois saves é seguro (idempotente). Resposta: `{groupId}`, para o web redirecionar.
- C7. Recusar: `status = DECLINED`, `respondedAt`. Resposta 204.
- C8. `GET /groups/:id/invites`: os convites PENDING do rolê (quem vê o rolê), para a tela mostrar "aguardando resposta".
- C9. Excluir o rolê apaga os convites (cascade).

**Pessoas** (globais, como na spec 003)
- P6. `/people` continua acessível a qualquer autenticado, sem filtro. É o que permite adicionar participantes sem conta.
- P7. Excluir uma Person vinculada a um usuário → 409 `Não é possível excluir uma pessoa vinculada a um usuário`. Essa checagem vem antes da P4.
- P8. `PersonOutput` ganha `hasAccount: boolean`, para o web esconder essas pessoas do "adicionar existente" e oferecer o convite.
- P9. `GET /people/:id` passa a listar em `groups` **apenas os rolês visíveis ao ator** (não vaza nomes de rolês alheios). O `groupCount` de `GET /people` também conta só os visíveis. A implementação usa o helper Prisma `groupVisibleWhere(scope)`, compartilhado (ver Impacto).

## Value Objects
| VO | Local | Regra / mensagens |
|---|---|---|
| `UniqueEntityId` | shared (existe) | sem mudança |
| `Username` | `modules/users/domain/value-objects/username.vo.ts` | não-string → `Usuário é obrigatório`. Faz `trim().toLowerCase()`, depois exige 3–30 caracteres → `Usuário deve ter entre 3 e 30 caracteres`, e `^[a-z0-9._-]+$` → `Usuário deve conter apenas letras sem acento, números, ponto, hífen ou sublinhado` |
| `Password` | `modules/users/domain/value-objects/password.vo.ts` | não-string → `Senha é obrigatória`. **Sem trim.** 8–128 caracteres → `Senha deve ter entre 8 e 128 caracteres`. O limite de 128 evita um scrypt caro com payload enorme. Só é usado na criação. O login **não** valida com o VO (A1) |
| `UserRole` | `modules/users/domain/value-objects/user-role.vo.ts` | `'USER' \| 'ADMIN'`, com `UserRole.create(raw?)`: `undefined` → USER, outro valor → `Papel inválido`. `isAdmin` |
| `PersonName` | people (existe) | sem mudança (usado no `name` de U5) |

## Domínio
- `shared/domain/actor.ts`: `type Actor = { userId: string; personId: string; role: 'USER' \| 'ADMIN' }`. São primitivos e chegam no Input dos Use Cases.
- `shared/domain/errors/`: `unauthorized.error.ts` (`kind: 'unauthorized'`) e `forbidden.error.ts` (`kind: 'forbidden'`), exportados no `index.ts`.
- `users/domain/user.entity.ts`: `User.create({username: Username, passwordHash: string, role: UserRole, personId: UniqueEntityId}, createdAt, id?)`, `restore(...)` e getters. `passwordHash` nunca vai para o Output.
- `users/domain/user.repository.ts` (token `USER_REPOSITORY`):
  ```ts
  interface UserRepository {
    findById(id: UniqueEntityId): Promise<User | null>;
    findByUsername(username: Username): Promise<User | null>;
    findByPersonId(personId: UniqueEntityId): Promise<User | null>;
    save(user: User): Promise<void>;                 // P2002 username → ConflictError (U2)
    list(): Promise<UserWithName[]>;                 // + nome da Person, username asc
    search(q: string, excludeId: UniqueEntityId, limit: number): Promise<UserWithName[]>;
  }
  ```
- `users/domain/password-hasher.port.ts`: `PasswordHasher { hash(plain): Promise<string>; verify(plain, hash): Promise<boolean> }` (token `PASSWORD_HASHER`).
- `auth/domain/token-service.port.ts`: `TokenService { sign(claims: {sub; role}): string; verify(token): {sub; role; exp} }`. Token inválido → `UnauthorizedError('Sessão expirada ou inválida')`. Recebe `Clock` por construtor.
- `Group` aggregate: ganha `ownerId: UniqueEntityId | null` (em `create` e no snapshot), `hasMember(personId)` e `removeMember` com R8, que compara com `ownerPersonId`. Como o aggregate não conhece o User, o `GroupSnapshot` ganha `ownerPersonId: UniqueEntityId | null`, que o mapper lê via `owner.personId`.
- `GroupRepository`: `findAll(scope)` e `listSummaries(scope)`, com `type GroupScope = {kind:'all'} | {kind:'user'; userId: string; personId: string}` e `scopeFor(actor)` em `groups/application/group-access.policy.ts`. Ganha também `countVisiblePeople(scope)`.
- `groups/domain/entities/group-invite.entity.ts`: `GroupInvite.create({groupId, inviterId, inviteeId}, createdAt)`, `restore`, `accept(now)` e `decline(now)` (≠ PENDING → `ConflictError` C5) e `isPending`.
- `groups/domain/group-invite.repository.ts` (token `GROUP_INVITE_REPOSITORY`): `findById`, `findPending(groupId, inviteeId)`, `listPendingForInvitee(inviteeId): PendingInviteView[]` (com o nome do rolê e os dados de quem convidou), `listPendingForGroup(groupId)`, `countPendingForInvitee(inviteeId)` e `save`.
- `PersonRepository`: `isLinkedToUser(id)`, e `listSummaries(scope)` / `getDetail(id, scope)` (P9).

**Dependências entre módulos:** `auth → users → people`, `groups → people` e `groups → users` (para resolver o convidado). Nenhum ciclo. Decorators e `Actor` ficam em `shared/` para que qualquer controller os use sem importar `auth`.

## Use Cases
Todos os que tocam rolê recebem `actor: Actor` no Input. `UserOutput = {id, username, name, role, personId, createdAt}`.

**`modules/users/application/use-cases/`**
| Arquivo | Input | Output | execute() / erros |
|---|---|---|---|
| `create-user.use-case.ts` (deps: UserRepository, PersonRepository, PasswordHasher, Clock) | `{username: string; password: string; name?: string; role?: string}` | `UserOutput` | regras U2–U5. O ADMIN é garantido pelo `@Roles` no controller, não no use case, porque o seed também usa este use case |
| `list-users.use-case.ts` | `{}` | `UserOutput[]` (username asc) | — |
| `search-users.use-case.ts` | `{actor: Actor; q: string}` | `{id; username; name}[]` | U6 |

**`modules/auth/application/use-cases/`**
| Arquivo | Input | Output | execute() / erros |
|---|---|---|---|
| `login.use-case.ts` (UserRepository, PasswordHasher, TokenService) | `{username: string; password: string}` | `{accessToken: string; user: UserOutput}` | A1/A2 |
| `get-current-user.use-case.ts` (UserRepository, GroupInviteRepository) | `{actor: Actor}` | `UserOutput & {pendingInviteCount: number}` | usuário sumiu → 401 `Sessão expirada ou inválida` |
| `authenticate-token.use-case.ts` (TokenService, UserRepository) | `{authorization?: string}` | `Actor` | A3. É usado pelo guard. A lógica fica fora do Nest para ser testável |

**`modules/groups/application/`**
- `group-access.policy.ts`: `canView`, `canManage`, `scopeFor`, `findAccessibleGroupOrFail` e `assertCanManage` (403). O arquivo `find-group-or-fail.ts` é removido.

| Arquivo | Mudança |
|---|---|
| `create-group.use-case.ts` (+PersonRepository) | Input `{actor; name}`. Aplica R5 com `Group.create({name, ownerId}, …)` + `addMember(personDoAtor)` |
| `list-groups.use-case.ts` | Input `{actor}` → `listSummaries(scopeFor(actor))` |
| `get-dashboard.use-case.ts` | Input `{actor}` → `findAll(scope)`, `peopleCount` por R6 |
| `get-group`, `get-settlement`, `add-expense`, `remove-expense`, `register-payment`, `remove-payment` | Input `+actor`, com R3 |
| `update-group`, `delete-group` | `+actor`, R3 + `assertCanManage` (R2) |
| `add-member.use-case.ts` (+UserRepository) | `+actor`, R3 e R7 (checado depois de resolver a Person e antes de `addMember`) |
| `remove-member.use-case.ts` | `+actor`, R3 e R8 (no aggregate) |
| `GroupDetailOutput` | ganha `ownerId: string \| null` |

**Novos use cases de convite** (`modules/groups/application/use-cases/`; deps: GroupRepository, GroupInviteRepository, UserRepository, PersonRepository, Clock conforme o caso)
| Arquivo | Input | Output | execute() / erros |
|---|---|---|---|
| `invite-user.use-case.ts` | `{actor; groupId; userId?: string; username?: string}` | `InviteOutput = {id; groupId; invitee: {id; username; name}; status; createdAt}` | C1–C2 |
| `list-group-invites.use-case.ts` | `{actor; groupId}` | `InviteOutput[]` | R3, C8 |
| `list-my-invites.use-case.ts` | `{actor}` | `{id; group: {id; name}; inviter: {id; username; name}; createdAt}[]` | C4 |
| `accept-invite.use-case.ts` | `{actor; inviteId}` | `{groupId: string}` | C5, C6 |
| `decline-invite.use-case.ts` | `{actor; inviteId}` | `void` | C5, C7 |

**People:** `delete-person` aplica P7. `list-people` e `get-person` recebem `{actor}` (P9). `PersonOutput.hasAccount` (P8).

## Prisma (`api/prisma/schema.prisma`)
```prisma
enum UserRole { USER ADMIN }
enum InviteStatus { PENDING ACCEPTED DECLINED }

model User {
  id           String        @id
  username     String        @unique          // já normalizado (lowercase)
  passwordHash String
  role         UserRole      @default(USER)
  personId     String        @unique
  createdAt    DateTime
  person       Person        @relation(fields: [personId], references: [id], onDelete: Restrict)
  ownedGroups  Group[]
  invitesSent     GroupInvite[] @relation("InviteInviter")
  invitesReceived GroupInvite[] @relation("InviteInvitee")
}

model GroupInvite {
  id          String       @id
  groupId     String
  inviterId   String
  inviteeId   String
  status      InviteStatus @default(PENDING)
  createdAt   DateTime
  respondedAt DateTime?
  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  inviter User  @relation("InviteInviter", fields: [inviterId], references: [id], onDelete: Cascade)
  invitee User  @relation("InviteInvitee", fields: [inviteeId], references: [id], onDelete: Cascade)
  @@index([inviteeId, status])
  @@index([groupId, status])
}
```
- `Person` ganha `user User?`. `Group` ganha `ownerId String?`, `owner User? @relation(fields:[ownerId], references:[id], onDelete: SetNull)`, `invites GroupInvite[]` e `@@index([ownerId])`.
- A unicidade de convite pendente por `(groupId, inviteeId)` fica na aplicação (C2). Um índice parcial exigiria SQL manual na migration. Fica como follow-up opcional.
- Migration: `npx prisma migrate dev --name auth` (Postgres do docker compose) → `api/prisma/migrations/<timestamp>_auth/migration.sql`. Ela só adiciona: 2 enums, 2 tabelas e 1 coluna nullable com FK. Não precisa de backfill.
- `group.mapper.ts`: `groupInclude` ganha `owner: { select: { personId: true } }`. O `save` grava `ownerId` no `create` (no `update` ele não muda).
- `shared/infrastructure/group-visibility.ts`: `groupVisibleWhere(scope): Prisma.GroupWhereInput` (`{}` para `all`, `OR: [{ownerId: userId}, {members: {some: {personId}}}]` para `user`). É usado por `PrismaGroupRepository` e `PrismaPersonRepository` e precisa ficar equivalente a R1 (o e2e cobre).

## Contrato HTTP
**Públicos:** `POST /auth/login`, `GET /health` (`@Public()`).

**Novos**
| Método/rota | Quem | Body / query | Resposta |
|---|---|---|---|
| `POST /auth/login` | público | `{username: string, password: string}` | 200 `{accessToken, user: User}`. 401 A1 |
| `GET /auth/me` | autenticado | — | 200 `User & {pendingInviteCount: number}` |
| `GET /users` | ADMIN | — | 200 `User[]` |
| `POST /users` | ADMIN | `{username, password, name?, role?: 'USER'\|'ADMIN'}` | 201 `User`. 409 U2/U5 |
| `GET /users/search` | autenticado | `?q=` | 200 `{id, username, name}[]` |
| `POST /groups/:id/invites` | vê o rolê | `{userId?: string, username?: string}` | 201 `Invite` |
| `GET /groups/:id/invites` | vê o rolê | — | 200 `Invite[]` (pendentes) |
| `GET /invites` | autenticado | — | 200 `ReceivedInvite[]` |
| `POST /invites/:id/accept` | convidado | — | 200 `{groupId}` |
| `POST /invites/:id/decline` | convidado | — | 204 |

`User = {id, username, name, role, personId, createdAt}`. `Invite = {id, groupId, invitee: {id, username, name}, status, createdAt}`. `ReceivedInvite = {id, group: {id, name}, inviter: {id, username, name}, createdAt}`.

**Alterados:** todos os endpoints existentes exigem Bearer (401 sem token). `GET /groups`, `GET /dashboard`, `GET /people` (`groupCount`) e `GET /people/:id` (`groups`) passam a ser filtrados (R6/P9). `GroupDetail` ganha `ownerId`. `Person` ganha `hasAccount`. `PATCH`/`DELETE /groups/:id` podem dar 403. `POST /groups/:id/members` pode dar 409 R7. `DELETE /groups/:id/members/:mid` pode dar 409 R8. `DELETE /people/:id` pode dar 409 P7.

**DTOs** (class-validator, `whitelist` + `forbidNonWhitelisted`): `LoginDto` (`IsString`, `IsNotEmpty`, `MaxLength(128)`), `CreateUserDto` (`username`/`password` `IsString`, `name` `IsOptional IsString`, `role` `IsOptional IsIn(['USER','ADMIN'])`), `SearchUsersQueryDto` (`q` `IsString`), `InviteUserDto` (`userId`/`username` `IsOptional IsString`; a regra de "exatamente um" fica no use case).

## Impacto por camada (API)
- **shared/**: `domain/actor.ts`. `domain/errors/{unauthorized,forbidden}.error.ts`. `presentation/auth.decorators.ts` (`Public()`, `Roles(...roles)`, `CurrentUser()` param decorator que lê `request.actor`). `all-exceptions.filter.ts` com 401/403. `infrastructure/group-visibility.ts`. `health.controller.ts` com `@Public()`.
- **users/** (novo): domain (entity, repo, VOs, `password-hasher.port.ts`), application (3 use cases + `dto/user.output.ts`), infrastructure (`prisma-user.repository.ts`, `user.mapper.ts`, `in-memory-user.repository.ts`, `scrypt-password-hasher.ts`), presentation (`users.controller.ts` com `@Roles('ADMIN')` em GET/POST e `search` só autenticado, mais os DTOs) e `users.module.ts` (exporta `USER_REPOSITORY`, `PASSWORD_HASHER`, `CreateUserUseCase`). `testing/fixtures.ts` com `makeActor()` e `makeUser()`.
- **auth/** (novo): `domain/token-service.port.ts`. `application/use-cases/{login,get-current-user,authenticate-token}.use-case.ts`. `infrastructure/{hmac-jwt-token.service.ts,auth.config.ts}`. `presentation/{auth.controller.ts,auth.guard.ts,dto/login.dto.ts}`. `auth.module.ts` registra `{provide: APP_GUARD, useClass: AuthGuard}`. O guard funciona assim: rota `@Public` → passa. Senão, roda `AuthenticateTokenUseCase`, grava `req.actor` e, se houver `@Roles`, confere (403 A4).
- **groups/**: aggregate (`ownerId`, `ownerPersonId`, `hasMember`, R8), mapper, repos (`scope`, `countVisiblePeople`), `group-access.policy.ts`, todos os use cases com `actor`, os 5 use cases de convite, `GroupInvite` (entity, repo Prisma e in-memory, mapper), `invites.controller.ts` (`/invites`), rotas `/groups/:id/invites` no `groups.controller.ts`, todos os handlers passando `@CurrentUser()`, e `groups.module.ts` importando `UsersModule` e exportando `GROUP_INVITE_REPOSITORY` (usado por `auth` em `get-current-user`; `auth` importa `GroupsModule`, sem ciclo, porque `groups` não importa `auth`).
- **people/**: `delete-person` (P7), `list/get` com `actor` (P9), `PersonOutput.hasAccount` e o controller com `@CurrentUser()`.
- **Raiz:** `app.module.ts` importa `UsersModule` e `AuthModule`. `main.ts` e `seed.ts` chamam `loadEnvFileIfPresent()` (`process.loadEnvFile('.env')` dentro de try, só se o arquivo existir) antes de criar o app, para o `JWT_SECRET`/`ADMIN_PASSWORD` locais valerem. `loadAuthConfig` roda na criação do `AuthModule`, então um boot sem segredo em produção falha antes do `listen`.
- **Implementações:**
  - `ScryptPasswordHasher`: salt de 16 bytes (`randomBytes`), `N=16384, r=8, p=1, keylen=64`, formato `scrypt$16384$8$1$<saltB64>$<hashB64>`. `verify` faz parse, recalcula com os parâmetros do hash e compara com `timingSafeEqual` (comprimentos diferentes ou formato inválido → `false`, sem lançar erro).
  - `HmacJwtTokenService`: segmentos base64url. No `verify`, exige exatamente 3 partes, header `{"alg":"HS256","typ":"JWT"}` (outro `alg`, inclusive `none` → inválido), assinatura comparada com `timingSafeEqual`, `exp > clock.now()` em segundos e `sub`/`role` string.

## Seed (`api/src/seed.ts`)
- Usa `NestFactory.createApplicationContext(AppModule, {logger: ['error','warn']})`, obtém `USER_REPOSITORY` e `CreateUserUseCase`, e fecha o contexto no fim. Assim reaproveita VOs e U5: se já existir uma Person "Huguinho" sem conta, ela é vinculada.
- Para cada um de `[{username:'huguinho', password:'huguinho123', name:'Huguinho'}, {luizinho…'Luizinho'}, {zezinho…'Zezinho'}]` (role USER): se `findByUsername` encontrar o usuário, **não faz nada** (nunca reseta a senha nem muda o papel). Senão, cria.
- Admin `admin` (nome `Administrador`, role ADMIN): a senha vem de `ADMIN_PASSWORD`. Sem a env, fora de produção usa `admin123`. **Em produção sem a env**, não cria e loga `ADMIN_PASSWORD não definida: admin não criado`. Com `ADMIN_PASSWORD` < 8 caracteres, o VO lança erro e o seed falha, derrubando o container. Isso é intencional (senha fraca configurada).
- Loga `seed: criado <username>` ou `seed: <username> já existe`. Sai com código 0. Uma exceção sai com código ≠ 0 (o `start.sh` derruba o container).
- `api/package.json`: `"db:seed": "node scripts/ensure-env.js && nest build && node dist/seed.js"`. *Justificativa:* não há `ts-node`/`tsx`, e o `--experimental-strip-types` do Node não resolve imports sem extensão nem decorators. O `nest build` já compila `src/seed.ts` para `dist/seed.js`, o mesmo artefato da imagem.
- `api/.env.example`: `JWT_SECRET=` (comentário: obrigatório em produção, ≥ 32 caracteres, gere com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`) e `ADMIN_PASSWORD=admin123` (comentário: troque em produção). O `.env` da VPS precisa de `JWT_SECRET` e `ADMIN_PASSWORD` (o `env_file` já repassa).

## Impacto no web
**Rotas**
```
web/proxy.ts                         Next 16 (antigo middleware.ts). Confirmar nome/assinatura em node_modules/next/dist/docs
                                     (02-guides/upgrading/version-16.md). Sem cookie `session` e rota ≠ /login|/logout →
                                     redirect /login?next=<path+search>. Com cookie em /login → redirect /. matcher exclui
                                     _next/static, _next/image, favicon e arquivos estáticos
web/app/login/page.tsx               fora do (app), sem shell: card centralizado com Logo, LoginForm. Mensagem para ?expired=1
                                     ("Sua sessão expirou. Entre de novo."). Se DEMO_ACCOUNT_HINT=on, mostra as contas demo
web/app/login/actions.ts             loginAction: valida (loginSchema) → api.login (sem auth) → setSession → redirect(safeNextPath(next))
web/app/logout/route.ts              GET: apaga o cookie e redireciona para /login?expired=1 (destino do 401; ver lib/api)
web/app/(app)/actions.ts             logoutAction: apaga o cookie → redirect('/login')
web/app/(app)/convites/page.tsx      lista de ReceivedInvite com Aceitar (redirect /groups/[id]) / Recusar. Estado vazio
web/app/(app)/convites/actions.ts    acceptInviteAction, declineInviteAction
web/app/(app)/admin/usuarios/page.tsx  só ADMIN (getMe().role ≠ ADMIN → notFound()). Tabela de usuários + CreateUserForm
web/app/(app)/admin/usuarios/actions.ts createUserAction
web/app/(app)/groups/[id]/members/page.tsx  + seção "Convidar usuário": form GET ?q= (busca server-side via
                                     api.searchUsers), resultados com botão "Convidar" (inviteUserAction), lista "Aguardando
                                     resposta" (GET /groups/:id/invites). O "adicionar existente" omite pessoas com hasAccount
web/app/(app)/groups/[id]/edit/page.tsx  "Zona de perigo" e renomear só para dono/admin (me.id === group.ownerId || ADMIN);
                                     os demais veem um aviso. A API continua sendo a fonte de verdade (403)
```
**lib**
- `lib/session.ts` (`server-only`): `SESSION_COOKIE = 'session'`, `getSessionToken()`, `setSession(token)` (`httpOnly`, `sameSite:'lax'`, `path:'/'`, `maxAge: 7*24*3600`, `secure: cookieSecure()`) e `clearSession()`. `cookieSecure()` = `SESSION_COOKIE_SECURE` (`'true'|'false'`) se definida, senão `NODE_ENV === 'production'`.
- `lib/api.ts`: `request(path, init, {auth = true})`. Com `auth`, lê o token e envia `Authorization: Bearer`. Um **401 com `auth`** faz `redirect('/logout')`. Componentes de servidor não podem apagar cookie, e redirecionar direto para `/login` com cookie inválido entraria em loop com o proxy. Novos: `login` (`auth:false`), `me`, `listUsers`, `createUser`, `searchUsers`, `inviteUser`, `listGroupInvites`, `listMyInvites`, `acceptInvite` e `declineInvite`.
- `lib/queries.ts`: `getMe = cache(() => api.me())`.
- `lib/types.ts`: `UserRole`, `User`, `Me`, `UserSearchResult`, `Invite`, `ReceivedInvite`, `CreateUserInput`. `GroupDetail.ownerId`, `Person.hasAccount`.
- `lib/validation.ts`: `loginSchema` (`username` com trim, 1–30; `password` 1–128; mensagens `Informe o usuário` / `Informe a senha`), `createUserSchema` (espelha os VOs: username 3–30 `[a-z0-9._-]` após lowercase, senha 8–128, `name` opcional ≤ 40, `role` enum), `inviteSchema` (`groupId` uuid, `userId` uuid).
- `lib/auth-redirect.ts` (puro): `safeNextPath(raw)` aceita só strings que começam com `/` e não com `//` ou `/\`, sem `\r\n`, e diferentes de `/login`/`/logout`. Qualquer outra coisa → `/`. Também tem `loginRedirectUrl(pathname, search)`.

**Componentes**
- `features/auth/LoginForm.tsx` (client, `useFormAction`, `FormError`, preserva o username em caso de erro, `autoComplete="username"`/`"current-password"`, botão com estado pendente).
- `features/shell/`: o `AppShell` (server) busca `getMe()` e passa `me` para a `Navbar` e a `Sidebar`. A `Navbar` mostra nome/username, badge "admin" e o botão **Sair** (form com `logoutAction`). `nav-items.ts` ganha `{href:'/convites', label:'Convites', icon:'📨'}` e `{href:'/admin/usuarios', label:'Usuários', icon:'🛡️', adminOnly:true}`, além de `visibleNavItems(role)` (puro). `SidebarNav`/`MobileNav` mostram o badge com `pendingInviteCount` (> 0) em "Convites", com `aria-label` "Convites, N pendentes".
- `features/invites/InviteCard.tsx`, `features/groups/InviteUserSection.tsx`, `features/admin/{CreateUserForm,UsersTable}.tsx`. Seguem o tema escuro e os componentes de `features/ui` (`PageHeader`, `EmptyState`, `FormError`, `ActionButton`, `SectionTitle`).
- `web/healthcheck.js`: passa a consultar `/login` (200 sem sessão) em vez de `/` (que agora responde 307).
- `deploy/vps/docker-compose.yml` (web): repassa `SESSION_COOKIE_SECURE: ${SESSION_COOKIE_SECURE:-true}`.

## Tarefas e critérios de aceite

### Parte Backend
- **B1. Shared + VOs + User.** `Actor`, `UnauthorizedError`/`ForbiddenError` + filtro, `Username`, `Password`, `UserRole`, entidade `User` e `UserRepository` in-memory.
  - AC (unit): `Username.create('  Hugo.Silva ').value === 'hugo.silva'`. `'ab'`, 31 caracteres, `'joão'` e `'a b'` → 400 com a mensagem exata. `Password.create('1234567')` → 400, mas `' 12345678'` é aceita sem trim. `UserRole.create(undefined).value === 'USER'`, e `'ROOT'` → `Papel inválido`. O filtro mapeia `unauthorized`→401 e `forbidden`→403, com `error` `Unauthorized`/`Forbidden`.
- **B2. PasswordHasher e TokenService.**
  - AC (unit): `hash` gera saídas diferentes para a mesma senha (salt), e `verify` dá true para a correta e false para a errada, para hash malformado e para hash truncado (sem lançar erro). O token assinado é verificado e devolve `sub`/`role`. Com o clock avançado 7 dias + 1 s → `Sessão expirada ou inválida`. Payload adulterado, header com `alg:"none"`, assinatura de outro segredo ou 2 segmentos → inválido. `loadAuthConfig({NODE_ENV:'production'})` lança erro, `{NODE_ENV:'production', JWT_SECRET: 'x'.repeat(32)}` passa e `{}` usa o default.
- **B3. Prisma + migration + repositórios.** Schema, `migrate dev --name auth`, `PrismaUserRepository`, `PrismaGroupInviteRepository`, `groupVisibleWhere` e o mapper do Group com owner.
  - AC: `prisma validate` passa. A migration nova só contém `CREATE TYPE`, `CREATE TABLE`, `ALTER TABLE "Group" ADD COLUMN "ownerId"` + FK/índices. `migrate deploy` em um banco com dados da spec 003 aplica sem erro, e os rolês existentes ficam com `ownerId NULL`.
- **B4. Users + Auth (use cases, guard, controllers).**
  - AC (unit): create-user com username existente em outra caixa → 409 U2. Com `name` de uma Person sem conta → reaproveita o `personId`. Com Person já vinculada → 409 U5, sem criar User. Sem `name` → cria a Person com nome = username. Falha no save do User → a Person nova é removida. Login com usuário inexistente, senha errada e username `'@@'` → as três dão 401 com a mesma mensagem, e o hasher é chamado nos três casos. `authenticate-token`: sem header → `Não autenticado`, `Basic x` → `Não autenticado`, token válido de usuário apagado → `Sessão expirada ou inválida`. search-users: `q='a'` → 400, e o próprio ator não aparece.
- **B5. Policy + rolês.**
  - AC (unit, `group-access.policy`): matriz ADMIN/dono/membro/estranho × `canView`/`canManage` (8 casos). Rolê sem dono: só o ADMIN vê. Use cases: estranho em `get-group`, `add-expense`, `register-payment` etc. → 404 `Rolê não encontrado`. Membro não dono em `update-group`/`delete-group` → 403 `Acesso negado`. `create-group` grava o `ownerId` e a Person do ator é `members[0]`. `list-groups`/dashboard de um USER só contam os rolês visíveis. `add-member` com Person com conta → 409 R7 para USER e ok para ADMIN. `remove-member` do dono → 409 R8.
- **B6. Convites.**
  - AC (unit): cada passo de C2 na ordem, com a mensagem exata. Aceitar adiciona o membro e marca ACCEPTED com `respondedAt`. Aceitar quando já é membro → ok, sem duplicar o membro. Aceitar/recusar um convite de outro usuário (inclusive ADMIN) → 404. Responder um convite já respondido → 409. Depois de DECLINED, um novo convite é permitido (C3).
- **B7. People.** P7, P8, P9.
  - AC (unit): excluir uma Person vinculada → 409 P7, mesmo sem rolês. `hasAccount` fica true só para quem tem User. `get-person` de um USER não lista rolês que ele não vê.
- **B8. Seed + scripts.** `src/seed.ts`, `db:seed` e `.env.example`.
  - AC: rodar `npm run db:seed` duas vezes cria 4 usuários na primeira e nenhum na segunda, com os logs "já existe". Trocar a senha de `huguinho` no banco e rodar o seed de novo não altera o hash. Com `NODE_ENV=production`, `JWT_SECRET` válido e sem `ADMIN_PASSWORD` → cria os 3 users, loga o aviso e não cria o admin. Login `huguinho`/`huguinho123` → 200.
- **B9. e2e (`api/test/app.e2e-spec.ts`).** O `beforeAll` limpa na ordem `groupInvite`, `group`, `user`, `person`. Novo `test/auth-helper.ts`: `createUser(prisma, {username, password, role, name})` (usa o `ScryptPasswordHasher`) e `login(http, username, password) → token`, e o `http` autenticado via `.set('Authorization', \`Bearer ${token}\`)`. Os testes atuais rodam como um USER `ana` (ou admin, onde o cenário exigir), sem mudar as asserções de negócio, exceto que `members[0]` agora é o dono. Novos casos:
  - `GET /groups` sem token → 401 `Não autenticado`. Token lixo → 401 `Sessão expirada ou inválida`. `GET /health` sem token → 200. Login errado → 401 `Usuário ou senha inválidos`.
  - USER em `GET /users` e `POST /users` → 403. ADMIN cria um usuário → 201, e o username duplicado → 409.
  - Filtro: rolês de A não aparecem em `GET /groups` de B. `GET /groups/:idDeA` como B → 404, e as sub-rotas (`/settlement`, `/expenses`) também → 404. ADMIN vê os dois.
  - Convite: A convida B → B vê em `GET /invites` e `GET /auth/me` com `pendingInviteCount: 1` → aceita → `GET /groups/:id` como B → 200, B aparece em members e o rolê entra em `GET /groups` de B. B (membro) `PATCH`/`DELETE` → 403. Convidar B de novo → 409. A aceita o convite de B → 404. Recusar um convite já aceito → 409.
  - `POST /groups/:id/members {personId: personDeB}` como A → 409 R7. `DELETE /people/:personDeA` → 409 P7.
- **Geral:** `npm run test`, `typecheck`, `lint` e `test:e2e` (api) passam. Nenhum arquivo em `domain/`/`application/` importa `@nestjs/*` ou `@prisma/*`.

### Parte Frontend (depois do backend)
- **F1. Sessão, proxy e lib.** `proxy.ts`, `lib/session.ts`, `lib/auth-redirect.ts`, `api.ts` com Bearer e 401 → `/logout`, `app/logout/route.ts`.
  - AC (vitest, `auth-redirect.test.ts`): `safeNextPath('/groups/1?x=2') === '/groups/1?x=2'`. `'//evil.com'`, `'/\\evil.com'`, `'https://evil.com'`, `'javascript:alert(1)'`, `''`, `undefined` e `'/login'` → `'/'`. Manual: sem cookie, `/groups` → `/login?next=%2Fgroups`. Com cookie, `/login` → `/`. Cookie adulterado → a primeira chamada da API dá 401 → `/logout` → `/login?expired=1`, sem loop.
- **F2. Login/logout.** Página `/login`, `LoginForm`, `loginAction`, `logoutAction` e Navbar com usuário + Sair.
  - AC (vitest, `validation.test.ts`): `loginSchema` rejeita username vazio ou só espaços (`Informe o usuário`) e senha vazia (`Informe a senha`), e faz trim do username. Manual: credencial errada mostra `Usuário ou senha inválidos` e mantém o username digitado. Login correto vai para o `next` (ou `/`). O cookie `session` é `HttpOnly`, `SameSite=Lax`, `Max-Age=604800`. Sair apaga o cookie e volta ao `/login`. A página de login não tem o shell.
- **F3. Convites.** `/convites`, badge no nav e a seção "Convidar usuário" na página de membros.
  - AC: buscar `luiz` lista `luizinho`. Convidar mostra o item em "Aguardando resposta". Erros 409 aparecem via `FormError`. Como luizinho, o badge mostra 1. Aceitar redireciona para o rolê, e recusar remove o item da lista. O select "adicionar existente" não lista pessoas com conta. `visibleNavItems('USER')` não contém `/admin/usuarios` (vitest).
- **F4. Admin.** `/admin/usuarios`.
  - AC: o ADMIN vê a tabela e cria um usuário (o 409 aparece no form, preservando os campos exceto a senha). Um USER acessando a URL → not-found, e o item não aparece no nav. `createUserSchema` (vitest) rejeita `'ab'`, `'joão'` e senha de 7 caracteres.
- **F5. Ajustes de rolê.** Edit/excluir só para dono/admin, `ownerId` nos types e `healthcheck.js` em `/login`.
  - AC: um membro não dono não vê a "Zona de perigo". O 403 vindo da API, se forçado, aparece como mensagem. O healthcheck do container web continua saudável.
- **Geral:** `npm run typecheck`, `lint`, `test` e `build` (web) passam, e os testes atuais continuam verdes.

## Fora de escopo
Refresh token e revogação de sessão, reset/troca de senha, editar/remover/desativar usuários e alterar papel, rate limit e lockout de login, sair de um rolê por conta própria, cancelar convite enviado, transferir a posse de um rolê, notificação de convite por e-mail, índice parcial único para convite pendente, 2FA. Tudo isso vira follow-up.

## Riscos e dependências
- **Rolês sem dono em produção.** Depois da migration, todos os rolês existentes ficam com `ownerId NULL` e só o admin os vê, até que alguma Person membro seja vinculada a um usuário (R4). Mitigação: documentar no README/CHANGELOG. Se for preciso, o admin recria ou ajusta via SQL (`UPDATE "Group" SET "ownerId" = …`). Uma ferramenta para atribuir dono é follow-up.
- **Breaking de contrato.** Todo cliente da API passa a precisar de token. O único cliente é o `web/`, que é publicado junto. Por isso a API e o web **precisam** ser publicados na mesma versão (o CD já usa a mesma `APP_VERSION`).
- **Seed a cada start.** Ele é idempotente por username e nunca altera usuários existentes. Mesmo assim, as contas demo com senhas públicas (`huguinho123`…) passam a existir em produção. Desligue com `RUN_SEED=false` se a instância não for de demonstração. Uma falha no seed (ex.: `ADMIN_PASSWORD` curta, `JWT_SECRET` ausente) derruba o container, como já acontece hoje.
- **`JWT_SECRET` ausente na VPS** → a API não sobe depois do deploy. É preciso adicionar `JWT_SECRET` (≥ 32) e `ADMIN_PASSWORD` ao `.env` da VPS **antes** do deploy desta versão.
- **Cookie `secure` atrás de HTTP.** Se o nginx da VPS não terminar TLS, o cookie `secure` não é gravado e o login "não pega". Mitigação: `SESSION_COOKIE_SECURE=false` (só como paliativo).
- **Vínculo automático por nome (U5).** Criar o usuário "Ana" vincula a Person "Ana" já existente, e o novo usuário passa a ver os rolês antigos em que ela participa (R4). Isso é desejado para migrar, mas o admin deve saber. A tela de admin mostra a dica "se já existir uma pessoa com esse nome, ela será vinculada".
- **Busca de usuários aberta a autenticados** permite enumerar usernames. É aceitável num app entre amigos. O limite de 10 resultados e o `q` com ao menos 2 caracteres reduzem o abuso.
- **JWT caseiro.** O escopo é mínimo (HS256 fixo, rejeita `none`/outros `alg`, `timingSafeEqual`) e coberto por testes. Uma troca futura para `@nestjs/jwt` é transparente graças à porta `TokenService`.
- **Ordem:** B1→B2→B3→B4→B5→B6→B7→B8→B9 (cada passo com testes verdes), depois F1→F5. O F3 e o F4 podem ser feitos em paralelo depois do F2.

## Adendo A: rotina de limpeza dos dados de demonstração

Pedido posterior do usuário: "crie uma rotina de exclusão de dados dos usuários de demonstração".

**Regras**
- DM1. `User.isDemo Boolean @default(false)`. O seed marca `huguinho`, `luizinho` e `zezinho` com `isDemo=true` (e corrige o flag em usuários já existentes, sem tocar na senha). Admin e usuários criados por `POST /users` têm `isDemo=false`.
- DM2. `Person.createdById String?` (FK User, `onDelete: SetNull`). Gravado ao criar uma pessoa por `POST /people` ou por `POST /groups/:id/members` (busca-ou-cria). Fica `null` nas pessoas antigas e nas Persons vinculadas a um User.
- DM3. `PurgeDemoDataUseCase` (Input `{}`, Output `{groups, invites, people}` com as contagens), executado em uma transação:
  1. apaga os rolês cujo `ownerId` é de um usuário demo (o cascade leva membros, despesas, pagamentos e convites);
  2. apaga os convites restantes em que o convidante ou o convidado é demo;
  3. apaga as Persons com `createdById` de um usuário demo que não têm User vinculado e não participam de nenhum rolê restante (as que participam de rolês de usuários não demo ficam);
  4. **mantém** os usuários demo e as suas Persons, para que o login de demonstração continue funcionando.
  Rolês de usuários não demo **nunca** são apagados, mesmo que tenham membros demo.
- DM4. Disparos:
  - `POST /admin/demo/purge` (só ADMIN) → 200 com o Output;
  - script `npm run demo:purge` (`nest build && node dist/purge-demo.js`), que usa `createApplicationContext`, como o seed;
  - agendamento dentro do processo: `DEMO_PURGE_INTERVAL_HOURS` (inteiro > 0 liga; vazio ou `0` desliga, que é o default). Um provider com `OnApplicationBootstrap`/`OnModuleDestroy` usa `setInterval` (com `unref()`), sem dependência nova, e loga as contagens. Erro em uma execução é logado e não derruba a API. O compose da VPS passa `DEMO_PURGE_INTERVAL_HOURS: ${DEMO_PURGE_INTERVAL_HOURS:-24}`.
- DM5. Web: na tela `/admin/usuarios`, um botão "Limpar dados de demonstração" com confirmação, que chama a rota e mostra as contagens. Os usuários demo aparecem com o badge "demo". `GET /users` passa a trazer `isDemo`.

**Testes:** unit do use case com repositório in-memory ou porta `DemoDataPurger`, cobrindo o que é apagado e o que é preservado; e2e: rolê de huguinho apagado, rolê de admin com huguinho como membro preservado, 403 para USER na rota.

## Adendo B: ajustes da revisão
- P10. `PATCH /people/:id` em uma Person vinculada a um User só é permitido ao próprio usuário (`actor.personId`) ou a um ADMIN. Os demais recebem 403 `Só o próprio usuário ou um admin pode editar esta pessoa`. Sem isso, qualquer usuário poderia trocar a chave PIX de outra conta e desviar pagamentos.
- A5 (endurecido). O `JWT_SECRET` padrão de desenvolvimento só é aceito com `NODE_ENV` vazio, `development` ou `test`. Qualquer outro valor (production, staging...) exige um segredo de pelo menos 32 caracteres.
