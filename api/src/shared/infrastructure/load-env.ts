import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Carrega `.env` (se existir) sem sobrescrever variáveis já definidas. Em produção o env_file do compose já injeta. */
export function loadEnvFileIfPresent(file = resolve(process.cwd(), '.env')): void {
  try {
    if (existsSync(file)) process.loadEnvFile(file);
  } catch {
    // .env ilegível: segue com o ambiente atual
  }
}
