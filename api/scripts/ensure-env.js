const fs = require('node:fs');
const path = require('node:path');

const api = path.resolve(__dirname, '..');
const repo = path.resolve(api, '..');

// api/.env (DATABASE_URL da API) e .env da raiz (POSTGRES_* do docker compose).
for (const [dir, label] of [
  [api, 'api/.env'],
  [repo, '.env'],
]) {
  const env = path.join(dir, '.env');
  const example = path.join(dir, '.env.example');
  if (!fs.existsSync(env) && fs.existsSync(example)) {
    fs.copyFileSync(example, env);
    console.log(`Criado ${label} a partir de .env.example`);
  }
}
