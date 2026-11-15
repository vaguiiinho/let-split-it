import { describe, expect, it } from 'vitest';
import { cookieSecure } from './cookie-config';

describe('cookieSecure', () => {
  it('segue NODE_ENV quando SESSION_COOKIE_SECURE não está definida', () => {
    expect(cookieSecure({ NODE_ENV: 'production' })).toBe(true);
    expect(cookieSecure({ NODE_ENV: 'development' })).toBe(false);
    expect(cookieSecure({})).toBe(false);
  });

  it('SESSION_COOKIE_SECURE vence o NODE_ENV', () => {
    expect(cookieSecure({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' })).toBe(false);
    expect(cookieSecure({ NODE_ENV: 'development', SESSION_COOKIE_SECURE: 'true' })).toBe(true);
  });

  it('valor desconhecido cai no padrão por NODE_ENV', () => {
    expect(cookieSecure({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'talvez' })).toBe(true);
  });
});
