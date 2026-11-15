#!/bin/sh
# Entrypoint da imagem de produção: aplica as migrations, roda o seed (se houver) e sobe a API.
#
# Baseline automático: bancos criados via `prisma db push` já têm as tabelas, mas não têm a primeira migration
# registrada como aplicada. O `migrate deploy` então falha de um destes jeitos:
#   P3005  schema não vazio e sem tabela _prisma_migrations;
#   P3018  tentou aplicar a primeira migration e a tabela já existia (42P07);
#   P3009  a tentativa acima ficou registrada como "failed" (restarts seguintes).
# Se (e só se) a migration envolvida for a PRIMEIRA (baseline = o schema que o db push criou), ela é marcada
# como aplicada e o deploy roda de novo. Qualquer outra falha derruba o container, como deve ser.
set -eu

baseline=$(ls -1 prisma/migrations | grep -E '^[0-9]+_' | sort | head -n 1)

if out=$(npx prisma migrate deploy 2>&1); then
  echo "$out"
else
  echo "$out"
  if echo "$out" | grep -q 'P3005' \
    || { echo "$out" | grep -qE 'P3018|P3009' && echo "$out" | grep -qF "$baseline"; }; then
    echo "Banco criado sem migrations: baseline em ${baseline}"
    npx prisma migrate resolve --applied "$baseline"
    npx prisma migrate deploy
  else
    exit 1
  fi
fi

# Seed: roda a cada subida se existir src/seed.ts (compilado em dist/seed.js) — então ele PRECISA ser idempotente
# (upsert / "cria se não existir"). Desligue com RUN_SEED=false no .env. Falha no seed derruba o container.
if [ "${RUN_SEED:-true}" != "false" ] && [ -f dist/seed.js ]; then
  echo "Rodando seed (dist/seed.js)"
  node dist/seed.js
fi

exec node dist/main.js
