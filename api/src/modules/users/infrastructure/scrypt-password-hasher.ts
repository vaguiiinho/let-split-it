import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from '../domain/password-hasher.port';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function derive(plain: string, salt: Buffer, n: number, r: number, p: number, keylen: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(plain, salt, keylen, { N: n, r, p }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Hash de senha com scrypt nativo. Formato: scrypt$N$r$p$<saltB64>$<hashB64>. */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(plain, salt, N, R, P, KEYLEN);
    return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      const parts = hash.split('$');
      if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
      const [n, r, p] = [parts[1], parts[2], parts[3]].map(Number);
      if (![n, r, p].every((x) => Number.isInteger(x) && x > 0)) return false;
      const salt = Buffer.from(parts[4], 'base64');
      const expected = Buffer.from(parts[5], 'base64');
      // Comprimento fixo: uma chave truncada seria prefixo do scrypt e aceitaria a senha.
      if (salt.length === 0 || expected.length !== KEYLEN) return false;
      const actual = await derive(plain, salt, n, r, p, expected.length);
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }
}
