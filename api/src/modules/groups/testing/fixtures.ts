import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Clock } from '../domain/clock.port';
import { Group } from '../domain/group.aggregate';
import { AmountCents } from '../domain/value-objects/amount-cents.vo';
import { ExpenseDescription } from '../domain/value-objects/expense-description.vo';
import { GroupName } from '../domain/value-objects/group-name.vo';
import { MemberName } from '../domain/value-objects/member-name.vo';
import { PixKey } from '../domain/value-objects/pix-key.vo';
import { Weight } from '../domain/value-objects/weight.vo';
import { InMemoryGroupRepository } from '../infrastructure/in-memory-group.repository';

/** Relógio determinístico: cada chamada avança 1 minuto. */
export class FakeClock implements Clock {
  private t = Date.UTC(2026, 0, 1);
  now(): Date {
    this.t += 60_000;
    return new Date(this.t);
  }
}

export function makeRepo(): InMemoryGroupRepository {
  return new InMemoryGroupRepository();
}

/** Rolê com Ana, Bia e Cadu; Ana pagou 9000 e Bia 3000, dividido entre os três (saldos 5000/-1000/-4000). */
export async function seedGroup(repo: InMemoryGroupRepository, withExpenses = true) {
  const group = Group.create({ name: GroupName.create('Churras') }, new Date(Date.UTC(2026, 0, 1)));
  const ana = group.addMember(MemberName.create('Ana'), PixKey.createOptional('ana@pix.com'));
  const bia = group.addMember(MemberName.create('Bia'), null);
  const cadu = group.addMember(MemberName.create('Cadu'), null);
  if (withExpenses) {
    const participants = [ana, bia, cadu].map((m) => ({ memberId: m.id, weight: Weight.create() }));
    const add = (d: string, v: number, payerId: UniqueEntityId) =>
      group.addExpense({
        description: ExpenseDescription.create(d),
        amount: AmountCents.create(v),
        payerId,
        participants,
        createdAt: new Date(),
      });
    add('Carne', 9000, ana.id);
    add('Cerveja', 3000, bia.id);
  }
  await repo.save(group);
  return { group, ana, bia, cadu, gid: group.id.value };
}
