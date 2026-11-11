import type { Metadata } from 'next';
import { PersonForm } from '@/features/people/PersonForm';
import { PageHeader } from '@/features/ui/PageHeader';
import { getPerson, loadPersonOr404 } from '@/lib/queries';
import { updatePersonAction } from '../../actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    return { title: `Editar ${(await getPerson((await params).id)).name}` };
  } catch {
    return { title: 'Editar pessoa' };
  }
}

export default async function EditPersonPage({ params }: Props) {
  const { id } = await params;
  const person = await loadPersonOr404(id);
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: `/people/${person.id}`, label: person.name }} title="Editar pessoa" />
      <section aria-label="Dados da pessoa" className="card">
        <PersonForm action={updatePersonAction} person={person} cancelHref={`/people/${person.id}`} />
      </section>
    </div>
  );
}
