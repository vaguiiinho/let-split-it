# Run 004: autenticação, autorização, convites e limpeza demo

**Spec:** `docs/specs/004-autenticacao-autorizacao.md` (com os Adendos A e B) · **Branch:** `feat/auth-authorized` · **Caminho:** completo

## Agentes acionados
| Etapa | Agente | Modelo | Observação |
|---|---|---|---|
| Spec | planner | opus | Manteve as decisões do orquestrador. Acrescentou R7 (pessoa com conta só entra por convite), R8 (o dono não pode ser removido), P9 (pessoas não revelam rolês alheios), login com tempo constante e `/logout` como route/proxy |
| Backend + seed | backend-dev | sonnet | Sem dependências novas: scrypt e JWT HS256 com `node:crypto`. Uma migration só (`20261115223347_auth`) |
| Web + design | general-purpose (**fallback**) | herdado | `.claude/agents/frontend-dev.md` e `ui-designer.md` estão sem frontmatter e não foram registrados como agentes. As instruções deles foram passadas no prompt. Decisões visuais ficam em `web/DESIGN.md` |
| QA | tester | — | Rodou tudo, mais um smoke real web + API |
| Revisão | reviewer | — | Aprovado, sem vermelhos |

Backend e web rodaram em paralelo, a partir do contrato HTTP da spec.

## Decisões alteradas durante o run
- **Adendo A:** pedido do usuário no meio do run. Limpeza dos dados demo com `User.isDemo` e `Person.createdById`. Pode ser disparada por `POST /admin/demo/purge`, por `npm run demo:purge` ou por agendamento na API (`DEMO_PURGE_INTERVAL_HOURS`; o compose da VPS usa 24h). O usuário confirmou que o agendamento fica na API.
- **Adendo B:** amarelos 1 e 2 do reviewer, promovidos a bloqueadores pelo orquestrador porque são de segurança:
  - P10: a Person de uma conta só é editada pelo próprio usuário ou por ADMIN;
  - o segredo JWT padrão só vale com `NODE_ENV` vazio, `development` ou `test`.
- **`/logout`:** é respondido no `proxy.ts`, que gera redirect relativo ao host público. O route handler fica como reserva.

## Ambiente
A porta 5432 local está ocupada por outro projeto. O Postgres deste projeto subiu na porta 5433, com um override de compose fora do repositório, e os testes rodaram com `DATABASE_URL`/`DATABASE_URL_TEST` apontando para 5433.

## Resultado final dos testes
- API: unit com 41 suítes e 153 testes; e2e com 25 testes. Typecheck, lint e build limpos. Cobertura de 97% em statements.
- Web: vitest com 7 arquivos e 81 testes. Typecheck, lint e build limpos.
- Smoke real:
  - sem cookie, redireciona para `/login`;
  - login dos 4 usuários do seed;
  - convite huguinho → luizinho aceito, e zezinho recebe 404;
  - limpeza demo: 403 para USER e 200 para ADMIN, com os usuários preservados.
- Seed: idempotente (rodado 2x). Não reseta senha. Em produção, sem `ADMIN_PASSWORD`, não cria o admin.

## Follow-ups (amarelos)
1. `/admin/usuarios` para USER devolve status 200 com o fallback de 404, por causa do streaming. Fazer a checagem no layout se o 404 real importar.
2. `deploy.sh` deve checar `JWT_SECRET`/`ADMIN_PASSWORD` antes de subir. Documentar `RUN_SEED=false` para instâncias sem demo.
3. Mover `findOwnInviteOrFail` para `invite-access.policy.ts`.
4. Logout por GET (CSRF de logout, risco baixo).
5. `Bearer` só com espaços retorna "Sessão expirada" em vez de "Não autenticado".
6. Timeout explícito no `$transaction` da limpeza.
7. O seed marca `isDemo` pelo username: documentar o risco de existir um usuário real chamado huguinho, luizinho ou zezinho.
8. Índice único parcial para convite pendente. Fora de escopo: refresh token, reset/troca de senha, editar/remover usuários, rate limit de login.

## Antes do deploy
Colocar `JWT_SECRET` (32+ caracteres) e `ADMIN_PASSWORD` no `.env` da VPS, senão a API não sobe ou fica sem admin. API e web precisam sair na mesma versão.
