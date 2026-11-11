import Link from 'next/link';
import { plural } from '@/lib/format';
import type { PersonSummary } from '@/lib/types';
import { PersonAvatar } from './PersonAvatar';

export function PersonCard({ person }: { person: PersonSummary }) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="card flex h-full items-center gap-3 transition-transform hover:-translate-y-0.5 hover:-rotate-[0.4deg]"
    >
      <PersonAvatar name={person.name} />
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold break-words">{person.name}</h3>
        <p className="truncate text-sm">{person.pixKey ? `PIX: ${person.pixKey}` : 'sem chave PIX'}</p>
        <p className="text-xs text-muted-strong">
          {person.groupCount === 0 ? 'em nenhum rolê' : `em ${plural(person.groupCount, 'rolê', 'rolês')}`}
        </p>
      </div>
      <span aria-hidden className="text-xl">
        →
      </span>
    </Link>
  );
}
