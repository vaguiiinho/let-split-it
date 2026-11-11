// TODO(remover-apos-escolha) — sugestão de layout A (spec 003, F6).
import type { Metadata } from 'next';
import { SampleDashboard } from '@/features/sugestoes/SampleDashboard';
import { ShellA } from '@/features/sugestoes/ShellA';

export const metadata: Metadata = { title: 'Sugestão A', robots: { index: false } };

export default function SuggestionAPage() {
  return (
    <ShellA>
      <SampleDashboard title="Dashboard (sugestão A)" />
    </ShellA>
  );
}
