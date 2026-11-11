import { SidebarNav } from './SidebarNav';

/** Sidebar fixa (≥ md). No mobile a navegação fica no drawer do MobileNav. */
export function Sidebar() {
  return (
    <aside
      aria-label="Menu lateral"
      className="hidden border-r-2 border-line bg-surface/60 md:sticky md:top-[calc(var(--shell-top,0px)+4rem)] md:block md:h-[calc(100dvh-var(--shell-top,0px)-4rem)] md:overflow-y-auto"
    >
      <div className="p-4">
        <SidebarNav label="Principal" />
      </div>
    </aside>
  );
}
