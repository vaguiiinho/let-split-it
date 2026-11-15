#!/bin/sh
# Entrypoint da imagem de produção: aplica as migrations e sobe a API.
#
# Baseline automático (só acontece uma vez): bancos criados antes via `prisma db push` não têm a tabela
# _prisma_migrations, e o `migrate deploy` recusa com P3005 ("database schema is not empty"). Nesse caso a
# primeira migration (que é o schema que o db push criou) é marcada como aplicada e o deploy roda de novo,
# aplicando só as migrations posteriores.
set -eu

if ! out=$(npx prisma migrate deploy 2>&1); then
  echo "$out"
  if echo "$out" | grep -q 'P3005'; then
    baseline=$(ls -1 prisma/migrations | grep -E '^[0-9]+_' | sort | head -n 1)
    echo "Banco sem histórico de migrations: baseline em ${baseline}"
    npx prisma migrate resolve --applied "$baseline"
    npx prisma migrate deploy
  else
    exit 1
  fi
else
  echo "$out"
fi

exec node dist/main.js
