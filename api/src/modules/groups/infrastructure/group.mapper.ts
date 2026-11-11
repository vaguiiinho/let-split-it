import { Prisma } from '@prisma/client';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { PersonName } from '../../people/domain/value-objects/person-name.vo';
import { PixKey } from '../../people/domain/value-objects/pix-key.vo';
import { Expense } from '../domain/entities/expense.entity';
import { Member } from '../domain/entities/member.entity';
import { Payment } from '../domain/entities/payment.entity';
import { Group } from '../domain/group.aggregate';
import { AmountCents } from '../domain/value-objects/amount-cents.vo';
import { ExpenseDescription } from '../domain/value-objects/expense-description.vo';
import { GroupName } from '../domain/value-objects/group-name.vo';
import { Weight } from '../domain/value-objects/weight.vo';

export const groupInclude = {
  members: { orderBy: { position: 'asc' }, include: { person: true } },
  expenses: {
    orderBy: { position: 'asc' },
    include: { participants: { orderBy: { position: 'asc' } } },
  },
  payments: { orderBy: { position: 'asc' } },
} satisfies Prisma.GroupInclude;

export type GroupRow = Prisma.GroupGetPayload<{ include: typeof groupInclude }>;

/** Linha Prisma → aggregate. */
export function toDomain(row: GroupRow): Group {
  return Group.restore({
    id: UniqueEntityId.create(row.id),
    name: GroupName.create(row.name),
    createdAt: row.createdAt,
    members: row.members.map((m) =>
      Member.restore({
        id: UniqueEntityId.create(m.personId),
        name: PersonName.create(m.person.name),
        pixKey: PixKey.createOptional(m.person.pixKey),
      }),
    ),
    expenses: row.expenses.map((e) =>
      Expense.restore({
        id: UniqueEntityId.create(e.id),
        description: ExpenseDescription.create(e.description),
        amount: AmountCents.create(e.amountCents),
        payerId: UniqueEntityId.create(e.payerId),
        createdAt: e.createdAt,
        participants: e.participants.map((p) => ({
          memberId: UniqueEntityId.create(p.memberId),
          weight: Weight.create(p.weight),
        })),
      }),
    ),
    payments: row.payments.map((p) =>
      Payment.restore({
        id: UniqueEntityId.create(p.id),
        fromId: UniqueEntityId.create(p.fromId),
        toId: UniqueEntityId.create(p.toId),
        amount: AmountCents.create(p.amountCents),
        createdAt: p.createdAt,
      }),
    ),
  });
}

/** Aggregate → dados para persistência. */
export function toPersistence(group: Group) {
  const groupId = group.id.value;
  return {
    group: { id: groupId, name: group.name.value, createdAt: group.createdAt },
    members: group.members.map((m, position) => ({
      groupId,
      personId: m.id.value,
      position,
    })),
    expenses: group.expenses.map((e, position) => ({
      id: e.id.value,
      groupId,
      description: e.description.value,
      amountCents: e.amount.value,
      payerId: e.payerId.value,
      createdAt: e.createdAt,
      position,
      participants: e.participants.map((p, pos) => ({
        memberId: p.memberId.value,
        weight: p.weight.value,
        position: pos,
      })),
    })),
    payments: group.payments.map((p, position) => ({
      id: p.id.value,
      groupId,
      fromId: p.fromId.value,
      toId: p.toId.value,
      amountCents: p.amount.value,
      createdAt: p.createdAt,
      position,
    })),
  };
}
