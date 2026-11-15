export type NavItem = { href: string; label: string; icon: string; exact?: boolean; adminOnly?: boolean };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/groups', label: 'Rolês', icon: '🎉' },
  { href: '/people', label: 'Pessoas', icon: '🙋' },
  { href: '/convites', label: 'Convites', icon: '📨' },
  { href: '/admin/usuarios', label: 'Usuários', icon: '🛡️', adminOnly: true },
];

/** Itens do menu para o papel do usuário: os `adminOnly` só aparecem para ADMIN. */
export function visibleNavItems(role: string | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || role === 'ADMIN');
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
