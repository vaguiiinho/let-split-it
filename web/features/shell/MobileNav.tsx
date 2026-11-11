'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SidebarNav } from './SidebarNav';

/**
 * Drawer de navegação (< md) num <dialog> modal: o navegador cuida do foco preso e do Esc.
 * Fecha também no clique fora (backdrop) e quando a rota muda; o foco volta ao botão "Menu".
 */
export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, [pathname]);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost px-3 md:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
      >
        <span aria-hidden>☰</span> Menu
      </button>
      <dialog
        ref={dialogRef}
        id="menu-mobile"
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r-2 border-line bg-surface p-0 text-muted shadow-sticker backdrop:bg-black/60 open:flex open:flex-col md:hidden"
        onClose={() => {
          setOpen(false);
          buttonRef.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b-2 border-line px-4">
          <span className="text-lg font-black">Menu</span>
          <button type="button" className="btn btn-ghost px-3" onClick={close}>
            <span aria-hidden>✕</span>
            <span className="sr-only">Fechar menu</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNav label="Principal (menu)" onNavigate={close} />
        </div>
      </dialog>
    </>
  );
}
