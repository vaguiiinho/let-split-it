import { createHmac } from 'node:crypto';
import { loadAuthConfig } from './auth.config';
import { HmacJwtTokenService, TOKEN_TTL_SECONDS } from './hmac-jwt-token.service';

const INVALID = 'Sessão expirada ou inválida';
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function makeClock(start = Date.UTC(2026, 0, 1)) {
  let t = start;
  return { now: () => new Date(t), advance: (ms: number) => (t += ms) };
}

describe('HmacJwtTokenService', () => {
  const secret = 's'.repeat(40);

  it('assina e verifica, devolvendo sub/role/exp (iat + 7 dias)', () => {
    const clock = makeClock();
    const svc = new HmacJwtTokenService(secret, clock);
    const out = svc.verify(svc.sign({ sub: 'u1', role: 'ADMIN' }));
    expect(out).toMatchObject({ sub: 'u1', role: 'ADMIN' });
    expect(out.exp).toBe(Math.floor(clock.now().getTime() / 1000) + TOKEN_TTL_SECONDS);
  });

  it('expira após 7 dias + 1 s', () => {
    const clock = makeClock();
    const svc = new HmacJwtTokenService(secret, clock);
    const token = svc.sign({ sub: 'u1', role: 'USER' });
    clock.advance(TOKEN_TTL_SECONDS * 1000 - 1000);
    expect(svc.verify(token).sub).toBe('u1');
    clock.advance(2000);
    expect(() => svc.verify(token)).toThrow(INVALID);
  });

  it('rejeita payload adulterado, alg none, outro segredo e 2 segmentos', () => {
    const clock = makeClock();
    const svc = new HmacJwtTokenService(secret, clock);
    const token = svc.sign({ sub: 'u1', role: 'USER' });
    const [h, p, s] = token.split('.');
    const forged = b64({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), role: 'ADMIN' });
    expect(() => svc.verify(`${h}.${forged}.${s}`)).toThrow(INVALID);
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${p}.`;
    expect(() => svc.verify(none)).toThrow(INVALID);
    const noneSigned = `${b64({ alg: 'none', typ: 'JWT' })}.${p}`;
    const sig = createHmac('sha256', secret).update(noneSigned).digest('base64url');
    expect(() => svc.verify(`${noneSigned}.${sig}`)).toThrow(INVALID);
    const other = new HmacJwtTokenService('x'.repeat(40), clock).sign({ sub: 'u1', role: 'USER' });
    expect(() => svc.verify(other)).toThrow(INVALID);
    expect(() => svc.verify(`${h}.${p}`)).toThrow(INVALID);
    expect(() => svc.verify('lixo')).toThrow(INVALID);
    expect(() => svc.verify('')).toThrow(INVALID);
  });
});

describe('loadAuthConfig', () => {
  it('produção exige JWT_SECRET >= 32', () => {
    const msg = 'JWT_SECRET ausente ou curto (mín. 32) em produção';
    expect(() => loadAuthConfig({ NODE_ENV: 'production' })).toThrow(msg);
    expect(() => loadAuthConfig({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(31) })).toThrow(msg);
    expect(loadAuthConfig({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32) }).jwtSecret).toHaveLength(32);
  });

  it('qualquer ambiente não local (ex.: staging) também exige JWT_SECRET', () => {
    expect(() => loadAuthConfig({ NODE_ENV: 'staging' })).toThrow('JWT_SECRET ausente ou curto (mín. 32) em staging');
    expect(loadAuthConfig({ NODE_ENV: 'development' }).jwtSecret).toBe('dev-only-insecure-jwt-secret-change-me');
    expect(loadAuthConfig({ NODE_ENV: 'test' }).jwtSecret).toBe('dev-only-insecure-jwt-secret-change-me');
  });

  it('fora de produção usa o default quando ausente ou vazio', () => {
    expect(loadAuthConfig({}).jwtSecret).toBe('dev-only-insecure-jwt-secret-change-me');
    expect(loadAuthConfig({ JWT_SECRET: '' }).jwtSecret).toBe('dev-only-insecure-jwt-secret-change-me');
    expect(loadAuthConfig({ JWT_SECRET: 'abc' }).jwtSecret).toBe('abc');
  });
});
