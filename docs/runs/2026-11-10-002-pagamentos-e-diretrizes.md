# Run 002 — Diretrizes dos subagentes + pagamento total/parcial

- **Data:** 2026-11-10
- **Spec:** `docs/specs/002-pagamentos-e-diretrizes.md`
- **Caminho:** completo (regra de domínio nova + refatoração arquitetural).
- **Modelos:** planner/reviewer em `opus`, backend-dev/tester em `sonnet`, ambos disponíveis.
- **Fallback:** `frontend-dev` e `ui-designer` não estão registrados (os `.md` deles não têm frontmatter). O orquestrador fez o frontend reaproveitando componentes existentes, e o ui-designer não foi acionado porque não há tela nova.

## Agentes acionados
1. **planner:** escreveu a spec 002 (VOs, 11 Use Cases, regras de pagamento, contrato HTTP).
2. **backend-dev:** fez a API em `src/shared` + `src/modules/groups`, com VOs, `UniqueEntityId` v4, um Use Case por arquivo e o model `Payment`.
3. **orquestrador (web):** criou `RegisterPaymentForm`, a seção "Pagamentos registrados" e as actions `registerPaymentAction`/`removePaymentAction`.
4. **tester:** rodou as suítes e adicionou 1 teste de WhatsApp.
5. **reviewer:** **Aprovado**, sem bloqueadores.

## Decisões
- O saldo é `pago − consumido + enviado − recebido`. As transferências sugeridas e o PIX passam a refletir só o que ainda falta pagar.
- Um pagamento vale para qualquer par devedor→credor, até `min(|saldo devedor|, saldo credor)`. Valor acima disso dá 409. Desfazer é sempre permitido.
- Ids não-UUID v4 dão 400 (antes davam 404). O web já trata 400 como notFound.
- Criado o script `test:cov` na api.

## Testes finais
- api unit: 78 PASS (26 suítes). api e2e: 12 PASS. web: 33 PASS.
- typecheck e lint (api + web): PASS. Cobertura api: 99,6% stmts / 93% branches.
- Baseline (antes): 19 unit, 5 e2e, 32 web, tudo verde. Nenhuma regressão.

## Follow-ups (🟡 do reviewer)
1. Concorrência: `save` regrava o aggregate sem versionamento, e dois pagamentos simultâneos podem furar o limite. Adicionar `version` (lock otimista).
2. A checagem from≠to está duplicada em `Payment.create` e no aggregate.
3. `web/lib/validation.ts`: `idSchema` poderia usar `z.uuid()`.
4. `group.mapper.ts` revalida pelos VOs ao restaurar, então um dado legado inválido vira 500.
5. `RegisterPaymentForm.toInputValue` poderia ir para `lib/money`.
6. Partes A e B saíram num único commit (a spec sugeria separar).
