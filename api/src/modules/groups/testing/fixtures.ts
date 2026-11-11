import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Clock } from '../../../shared/domain/clock.port';
import { Person } from '../../people/domain/person.entity';
import { PersonName } from '../../people/domain/value-objects/person-name.vo';
import { PixKey } from '../../people/domain/value-objects/pix-key.vo';
import { InMemoryPersonRepository } from '../../people/infrastructure/in-memory-person.repository';
import { Group } from '../domain/group.aggregate';
import { AmountCents } from '../domain/value-objects/amount-cents.vo';
import { ExpenseDescription } from '../domain/value-objects/expense-description.vo';
import { GroupName } from '../domain/value-objects/group-name.vo';
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

export function makePeopleRepo(): InMemoryPersonRepository {
  return new InMemoryPersonRepository();
}

export function makePerson(name: string, pixKey: string | null = null): Person {
  return Person.create(
    { name: PersonName.create(name), pixKey: PixKey.createOptional(pixKey) },
    new Date(Date.UTC(2026, 0, 1)),
  );
}

/** Rolê com Ana, Bia e Cadu; Ana pagou 9000 e Bia 3000, dividido entre os três (saldos 5000/-1000/-4000). */
export async function seedGroup(
  repo: InMemoryGroupRepository,
  withExpenses = true,
  people?: InMemoryPersonRepository,
) {
  const group = Group.create({ name: GroupName.create('Churras') }, new Date(Date.UTC(2026, 0, 1)));
  const persons = [makePerson('Ana', 'ana@pix.com'), makePerson('Bia'), makePerson('Cadu')];
  for (const p of persons) await people?.save(p);
  const [ana, bia, cadu] = persons.map((p) => group.addMember(p));
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
  return { group, ana, bia, cadu, persons, gid: group.id.value };
}
