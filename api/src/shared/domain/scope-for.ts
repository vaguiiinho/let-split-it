import type { Actor } from './actor';
import type { GroupScope } from './group-scope';

/** Escopo de rolês visíveis para o ator: ADMIN vê todos. */
export function scopeFor(actor: Actor): GroupScope {
  return actor.role === 'ADMIN'
    ? { kind: 'all' }
    : { kind: 'user', userId: actor.userId, personId: actor.personId };
}
