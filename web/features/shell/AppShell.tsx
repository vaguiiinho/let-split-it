import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

/** Shell oficial (variação A): navbar no topo, sidebar fixa ≥ md (drawer < md) e footer. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="md:grid md:grid-cols-[16rem_1fr]">
        <Sidebar />
        <div className="flex min-h-[calc(100dvh-var(--shell-top,0px)-4rem)] min-w-0 flex-col">
          <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-16 focus:outline-none">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
}
