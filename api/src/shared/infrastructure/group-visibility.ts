import { Prisma } from '@prisma/client';
import type { GroupScope } from '../domain/group-scope';

/** Filtro Prisma equivalente a GroupAccessPolicy.canView (R1). */
export function groupVisibleWhere(scope: GroupScope): Prisma.GroupWhereInput {
  if (scope.kind === 'all') return {};
  return {
    OR: [{ ownerId: scope.userId }, { members: { some: { personId: scope.personId } } }],
  };
}
