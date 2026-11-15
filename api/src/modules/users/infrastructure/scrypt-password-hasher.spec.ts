import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('gera hashes distintos (salt) e verifica correta/errada', async () => {
    const a = await hasher.hash('senha-forte-1');
    const b = await hasher.hash('senha-forte-1');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await hasher.verify('senha-forte-1', a)).toBe(true);
    expect(await hasher.verify('outra', a)).toBe(false);
  });

  it('hash malformado ou truncado → false, sem lançar', async () => {
    const a = await hasher.hash('senha-forte-1');
    expect(await hasher.verify('x', 'lixo')).toBe(false);
    expect(await hasher.verify('x', '')).toBe(false);
    expect(await hasher.verify('x', 'scrypt$a$b$c$d$e')).toBe(false);
    expect(await hasher.verify('senha-forte-1', a.slice(0, a.length - 10))).toBe(false);
    expect(await hasher.verify('senha-forte-1', a.split('$').slice(0, 5).join('$'))).toBe(false);
  });
});
