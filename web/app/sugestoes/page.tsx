// TODO(remover-apos-escolha) — índice das sugestões de layout (spec 003, F6).
import type { Metadata } from 'next';
import Link from 'next/link';
import { SuggestionPage } from '@/features/sugestoes/SuggestionBanner';

export const metadata: Metadata = { title: 'Sugestões de layout', robots: { index: false } };

const OPTIONS = [
  {
    slug: 'a',
    title: 'A — Sidebar clássica',
    summary: 'Navbar no topo, sidebar fixa com ícones + rótulos e footer. É o shell oficial atual.',
    pros: ['Familiar e direta', 'Rótulos sempre visíveis', 'Drawer simples no mobile'],
    cons: ['Ocupa 16rem de largura no desktop', 'Pouco espaço para atalhos contextuais'],
  },
  {
    slug: 'b',
    title: 'B — Sidebar recolhível',
    summary: 'Sidebar só com ícones que expande para 16rem (preferência salva), topbar com busca.',
    pros: ['Mais área útil para tabelas e gráficos', 'Busca em destaque', 'Sem drawer: trilho de ícones no mobile'],
    cons: ['Ícones sozinhos exigem aprendizado', 'Busca ainda é só visual'],
  },
  {
    slug: 'c',
    title: 'C — Tabs no topo + atalhos à direita',
    summary: 'Navegação principal em tabs e uma sidebar contextual com atalhos do rolê ou da pessoa.',
    pros: ['Ações do contexto sempre à mão', 'Tabs funcionam bem no mobile (rolagem horizontal)'],
    cons: ['Sem espaço para crescer o menu principal', 'Atalhos vão para o fim da página no mobile'],
  },
];

export default function SuggestionsIndexPage() {
  return (
    <SuggestionPage showBack={false}>
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-5xl px-4 pt-8 pb-16 focus:outline-none">
        <h1 className="text-3xl font-black">Sugestões de layout</h1>
        <p className="mt-2 max-w-prose">
          Três propostas de navegação com dados fictícios. Escolha uma — as outras (e esta página) serão removidas.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {OPTIONS.map((o) => (
            <li key={o.slug} className="card flex flex-col">
              <h2 className="text-lg font-extrabold">{o.title}</h2>
              <p className="mt-2">{o.summary}</p>
              <h3 className="mt-4 text-sm font-extrabold text-pos">Prós</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {o.pros.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <h3 className="mt-4 text-sm font-extrabold text-neg">Contras</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {o.cons.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Link href={`/sugestoes/${o.slug}`} className="btn btn-primary mt-5 self-start">
                Ver variação {o.slug.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link href="/" className="inline-flex min-h-11 items-center rounded font-bold text-link underline underline-offset-2">
            ← Voltar ao app
          </Link>
        </p>
      </main>
    </SuggestionPage>
  );
}
