// TODO(remover-apos-escolha) — variação A: igual ao shell oficial (features/shell/AppShell).
import { AppShell } from '@/features/shell/AppShell';
import { SuggestionPage } from './SuggestionBanner';

export function ShellA({ children }: { children: React.ReactNode }) {
  return (
    <SuggestionPage>
      <AppShell>{children}</AppShell>
    </SuggestionPage>
  );
}
