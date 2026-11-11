'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isActive } from './nav-items';

export function SidebarNav({ label, onNavigate }: { label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-link"
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
              >
                <span aria-hidden className="text-lg">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
