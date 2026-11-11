import Link from 'next/link';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';

export function Navbar() {
  return (
    <header className="sticky top-[var(--shell-top,0px)] z-40 h-16 border-b-2 border-line bg-surface/95 backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4">
        <MobileNav />
        <Logo />
        <span className="hidden text-sm font-semibold lg:block">conta dividida, amizade mantida</span>
        <Link href="/groups#novo" className="btn btn-primary ml-auto px-3 text-sm sm:px-4">
          <span aria-hidden>✨</span> Novo rolê
        </Link>
      </div>
    </header>
  );
}
