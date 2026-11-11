# Run 003 — Pessoas globais, edição de rolês, dashboard e layout multi-página

- **Data:** 2026-11-10
- **Spec:** `docs/specs/003-pessoas-roles-layout.md`
- **Caminho:** completo (modelo de domínio novo + telas/navegação novas).
- **Modelos:** planner/reviewer `opus`, backend-dev/tester `sonnet` — disponíveis.
- **Fallback:** `frontend-dev`/`ui-designer` seguem sem frontmatter (não registrados); frontend executado por agente `general-purpose` instruído com os dois `.md`.
- **Interpretação:** "roles" = **rolês** (o `Group`), não RBAC.

## Agentes acionados
1. **planner** — spec 003 (Person global, `GroupMember` N:N, CRUD `/people`, `PATCH /groups/:id`, `GET /dashboard`, shell, sugestões, tema).
2. **backend-dev** (B1–B5) ‖ **frontend** (F1 tema, F2 shell, F6 sugestões) em paralelo.
3. **frontend** (F3 rolês em sub-rotas, F4 pessoas, F5 dashboard com gráficos SVG).
4. **tester** ‖ **reviewer** — QA verde + smoke real; revisão **Aprovado**, sem 🔴.
5. **orquestrador** — corrigiu 🟡 1 (marcador no DESIGN.md), 3 (P2003→409 no delete de pessoa) e 4 (key duplicada no BarChart).

## Decisões
- Reset dos bancos locais (`racha_ai`, `racha_ai_test`) com consentimento explícito do usuário; o Prisma bloqueia `--force-reset` vindo de IA.
- `scripts/e2e.js` usa `db push` **sem** `--force-reset` (desvio da spec) para não exigir consentimento a cada execução. Após atualizar para a spec 003 em outra máquina: `npm --prefix api run db:reset`.
- Sugestões de layout em `/sugestoes/{a,b,c}`; oficial = A. Remoção: `grep -rln "remover-apos-escolha" web/app web/features`.
- Contraste: `#7A8497` (≈4,2:1) só em texto ≥14px; títulos/valores `--ink`, texto pequeno `--muted-strong`.

## Testes finais
- api unit 98 PASS (30 suítes) · api e2e 17 PASS · web 46 PASS · typecheck/lint/build PASS.
- Baseline: 78 / 12 / 33, tudo verde. Nenhuma regressão.

## Follow-ups (🟡)
1. `get-dashboard.use-case.ts:82` — `Intl.DateTimeFormat` por despesa; criar um no módulo.
2. `MobileNav` — fechar o `<dialog>` ao passar para ≥ md (`matchMedia`).
3. `web/lib/validation.ts` — `personId` sem `idSchema` (consistência).
4. `update-person.dto.ts` — `IsOptional` em vez de `ValidateIf` (equivalente).
5. Criação inline de pessoa + rolê em transações separadas (pessoa órfã se salvar o rolê falhar).
6. Sem README na raiz para documentar `db:reset`.
