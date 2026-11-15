import { describe, expect, it } from 'vitest';
import { isActive, visibleNavItems } from './nav-items';

describe('visibleNavItems', () => {
  it('esconde o item de admin para USER', () => {
    const hrefs = visibleNavItems('USER').map((i) => i.href);
    expect(hrefs).not.toContain('/admin/usuarios');
    expect(hrefs).toContain('/convites');
  });

  it('mostra o item de admin para ADMIN', () => {
    expect(visibleNavItems('ADMIN').map((i) => i.href)).toContain('/admin/usuarios');
  });

  it('sem papel conhecido trata como USER', () => {
    expect(visibleNavItems(undefined).some((i) => i.adminOnly)).toBe(false);
  });
});

describe('isActive', () => {
  it('Dashboard só no exato e o resto por prefixo', () => {
    const [dash, groups] = visibleNavItems('USER');
    expect(isActive('/', dash!)).toBe(true);
    expect(isActive('/groups', dash!)).toBe(false);
    expect(isActive('/groups/1/edit', groups!)).toBe(true);
  });
});
