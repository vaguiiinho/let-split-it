const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const env = path.join(root, '.env');
if (!fs.existsSync(env)) {
  fs.copyFileSync(path.join(root, '.env.example'), env);
  console.log('Criado api/.env a partir de .env.example');
}
