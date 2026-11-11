import type { Metadata } from 'next';
import { PersonForm } from '@/features/people/PersonForm';
import { PageHeader } from '@/features/ui/PageHeader';
import { createPersonAction } from '../actions';

export const metadata: Metadata = { title: 'Nova pessoa' };

export default function NewPersonPage() {
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: '/people', label: 'Pessoas' }} title="Nova pessoa" />
      <section aria-label="Dados da pessoa" className="card">
        <PersonForm action={createPersonAction} cancelHref="/people" />
      </section>
    </div>
  );
}
