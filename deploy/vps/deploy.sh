#!/usr/bin/env bash
# Deploy na VPS. Uso (na pasta do projeto na VPS): bash deploy.sh <versão>   ex.: bash deploy.sh 1.0.6
#
# 1. valida a versão, o .env e o compose novo (docker-compose.yml.new, enviado pelo CD);
# 2. baixa as imagens da versão ANTES de mexer em qualquer coisa (se falhar, nada muda);
# 3. faz backup do banco (pg_dump) — as migrations rodam quando a API sobe;
# 4. grava APP_VERSION no .env e sobe com `docker compose up -d --wait`.
# Nunca usa `down` nem `-v`: o volume do banco (split-postgres-data) não é tocado.
set -euo pipefail

VERSION="${1:-}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Uso: bash deploy.sh <X.Y.Z> (recebido: '${VERSION}')" >&2; exit 2; }
cd "$(dirname "$(readlink -f "$0")")"

KEEP_BACKUPS=10
log() { printf '\n==> %s\n' "$*"; }

# --- 1. validações -----------------------------------------------------------------------------------------------
[ -f .env ] || { echo ".env não encontrado em $(pwd)" >&2; exit 1; }
for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB; do
  grep -qE "^${var}=.+" .env || { echo "Falta ${var} no .env" >&2; exit 1; }
done

if [ -f docker-compose.yml.new ]; then
  log "Validando o docker-compose.yml novo"
  APP_VERSION="$VERSION" docker compose -f docker-compose.yml.new config -q
  if [ -f docker-compose.yml ] && ! cmp -s docker-compose.yml docker-compose.yml.new; then
    cp docker-compose.yml "docker-compose.yml.bak"
    echo "compose anterior salvo em docker-compose.yml.bak"
  fi
  mv docker-compose.yml.new docker-compose.yml
fi
[ -f docker-compose.yml ] || { echo "docker-compose.yml não encontrado" >&2; exit 1; }

# --- 2. imagens --------------------------------------------------------------------------------------------------
log "Baixando as imagens ${VERSION}"
APP_VERSION="$VERSION" docker compose pull api web

# --- 3. backup do banco ------------------------------------------------------------------------------------------
if [ "$(docker inspect -f '{{.State.Running}}' split-postgres 2>/dev/null || true)" = "true" ]; then
  mkdir -p backups
  backup="backups/split-$(date -u +%Y%m%dT%H%M%SZ)-antes-de-${VERSION}.sql.gz"
  log "Backup do banco em ${backup}"
  # Variáveis expandidas DENTRO do container (aspas simples): a senha não passa pela linha de comando do host.
  docker exec split-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$backup"
  chmod 600 "$backup"
  # Mantém só os últimos KEEP_BACKUPS (nomes gerados acima, sem espaços).
  # shellcheck disable=SC2012
  ls -1t backups/split-*.sql.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --
else
  log "Postgres não está rodando: backup pulado (primeiro deploy?)"
fi

# --- 4. sobe a versão nova ---------------------------------------------------------------------------------------
if grep -q '^APP_VERSION=' .env; then
  sed -i "s/^APP_VERSION=.*/APP_VERSION=${VERSION}/" .env
else
  printf '\nAPP_VERSION=%s\n' "$VERSION" >> .env
fi

log "Subindo ${VERSION} (recria só o que mudou; o banco e o volume ficam como estão)"
if ! docker compose up -d --wait --wait-timeout 300; then
  echo "Deploy falhou: containers não ficaram saudáveis." >&2
  docker compose ps >&2 || true
  docker compose logs --tail 80 api web >&2 || true
  exit 1
fi

docker compose ps

# Remove só imagens antigas DESTE projeto (outros projetos da VPS não são tocados); imagens em uso não são removidas.
docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep -E '^vaguiiinho/let-split-it-(api|web):' \
  | grep -vE ":(${VERSION//./\\.}|latest)$" \
  | xargs -r docker rmi >/dev/null 2>&1 || true
docker compose -f /root/projects/infra/docker-compose.yml restart nginx \
  || echo "AVISO: não foi possível reiniciar o nginx (/root/projects/infra/docker-compose.yml)" >&2
log "Deploy ${VERSION} concluído"