// TODO(remover-apos-escolha) — sugestão de layout C (spec 003, F6).
import type { Metadata } from 'next';
import { SampleDashboard } from '@/features/sugestoes/SampleDashboard';
import { ShellC } from '@/features/sugestoes/ShellC';

export const metadata: Metadata = { title: 'Sugestão C', robots: { index: false } };

export default function SuggestionCPage() {
  return (
    <ShellC>
      <SampleDashboard title="Dashboard (sugestão C)" />
    </ShellC>
  );
}
