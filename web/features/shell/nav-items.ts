export type NavItem = { href: string; label: string; icon: string; exact?: boolean };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/groups', label: 'Rolês', icon: '🎉' },
  { href: '/people', label: 'Pessoas', icon: '🙋' },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
