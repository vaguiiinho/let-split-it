'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { isActive, visibleNavItems } from './nav-items';

export type NavUser = { role: UserRole; pendingInviteCount: number };

export function SidebarNav({ label, user, onNavigate }: { label: string; user: NavUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const pending = user.pendingInviteCount;
  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {visibleNavItems(user.role).map((item) => {
          const active = isActive(pathname, item);
          const badge = item.href === '/convites' && pending > 0 ? pending : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-link"
                aria-current={active ? 'page' : undefined}
                aria-label={badge ? `${item.label}, ${badge} ${badge === 1 ? 'pendente' : 'pendentes'}` : undefined}
                onClick={onNavigate}
              >
                <span aria-hidden className="text-lg">
                  {item.icon}
                </span>
                {item.label}
                {badge > 0 && (
                  <span
                    aria-hidden
                    className="ml-auto grid h-6 min-w-6 place-items-center rounded-full border-2 border-line bg-accent px-1.5 text-xs font-black text-accent-ink tabular-nums"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
