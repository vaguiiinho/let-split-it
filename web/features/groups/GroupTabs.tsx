'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { slug: '', label: 'Visão geral', icon: '🏠' },
  { slug: '/expenses', label: 'Despesas', icon: '🧾' },
  { slug: '/settlement', label: 'Acerto', icon: '🤝' },
  { slug: '/members', label: 'Pessoas', icon: '🙋' },
] as const;

/** Abas das sub-rotas do rolê; a atual recebe aria-current="page". Rola na horizontal no celular. */
export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;
  return (
    <nav aria-label="Seções do rolê" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex min-w-max gap-2">
        {TABS.map((tab) => {
          const href = `${base}${tab.slug}`;
          return (
            <li key={tab.slug}>
              <Link href={href} className="nav-link whitespace-nowrap" aria-current={pathname === href ? 'page' : undefined}>
                <span aria-hidden>{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
