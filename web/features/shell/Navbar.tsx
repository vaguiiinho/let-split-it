import Link from 'next/link';
import { logoutAction } from '@/app/(app)/actions';
import type { Me } from '@/lib/types';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';
import type { NavUser } from './SidebarNav';

export function Navbar({ me, navUser }: { me: Me; navUser: NavUser }) {
  return (
    <header className="sticky top-[var(--shell-top,0px)] z-40 h-16 border-b-2 border-line bg-surface/95 backdrop-blur">
      <div className="flex h-full items-center gap-2 px-4 sm:gap-3">
        <MobileNav user={navUser} />
        <Logo />
        <span className="hidden text-sm font-semibold xl:block">conta dividida, amizade mantida</span>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link href="/groups#novo" className="btn btn-primary hidden px-3 text-sm sm:inline-flex sm:px-4">
            <span aria-hidden>✨</span> Novo rolê
          </Link>
          <div className="hidden min-w-0 text-right leading-tight md:block">
            <p className="flex items-center justify-end gap-1.5 truncate text-sm font-bold text-ink">
              {me.name}
              {me.role === 'ADMIN' && (
                <span className="rounded-md border-2 border-line bg-accent px-1.5 text-[0.7rem] font-black text-accent-ink uppercase">
                  admin
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-strong">@{me.username}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost px-3 text-sm" aria-label={`Sair (conectado como ${me.username})`}>
              <span aria-hidden>🚪</span> Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
