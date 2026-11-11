// TODO(remover-apos-escolha) — sugestão de layout B (spec 003, F6).
import type { Metadata } from 'next';
import { SampleDashboard } from '@/features/sugestoes/SampleDashboard';
import { ShellB } from '@/features/sugestoes/ShellB';

export const metadata: Metadata = { title: 'Sugestão B', robots: { index: false } };

export default function SuggestionBPage() {
  return (
    <ShellB>
      <SampleDashboard title="Dashboard (sugestão B)" />
    </ShellB>
  );
}
