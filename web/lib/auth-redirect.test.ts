import { describe, expect, it } from 'vitest';
import { loginRedirectUrl, safeNextPath } from './auth-redirect';

describe('safeNextPath', () => {
  it('aceita caminhos internos com query', () => {
    expect(safeNextPath('/groups/1?x=2')).toBe('/groups/1?x=2');
    expect(safeNextPath('/convites')).toBe('/convites');
  });

  it.each([
    ['//evil.com'],
    ['/\\evil.com'],
    ['https://evil.com'],
    ['javascript:alert(1)'],
    [''],
    [undefined],
    [null],
    [42],
    ['/login'],
    ['/login?next=/x'],
    ['/logout'],
    ['/login/'],
    ['/groups\r\nSet-Cookie: x=1'],
    ['groups'],
  ])('rejeita %j → "/"', (raw) => {
    expect(safeNextPath(raw)).toBe('/');
  });
});

describe('loginRedirectUrl', () => {
  it('preserva o destino codificado', () => {
    expect(loginRedirectUrl('/groups')).toBe('/login?next=%2Fgroups');
    expect(loginRedirectUrl('/groups/1', '?q=luiz')).toBe('/login?next=%2Fgroups%2F1%3Fq%3Dluiz');
  });

  it('sem destino útil vai só para /login', () => {
    expect(loginRedirectUrl('/')).toBe('/login');
    expect(loginRedirectUrl('//evil.com')).toBe('/login');
  });
});
