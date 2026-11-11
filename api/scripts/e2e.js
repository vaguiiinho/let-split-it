// Roda os testes e2e contra o banco isolado DATABASE_URL_TEST (Postgres do docker compose).
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  console.error('Defina DATABASE_URL_TEST em api/.env (veja api/.env.example).');
  process.exit(1);
}
if (url === process.env.DATABASE_URL) {
  console.error('DATABASE_URL_TEST não pode ser igual a DATABASE_URL: os e2e apagam os dados.');
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url };
const run = (cmd) => execSync(cmd, { cwd: root, env, stdio: 'inherit' });
run('npx prisma db push --skip-generate');
run('npx jest --config jest-e2e.config.js --runInBand');
