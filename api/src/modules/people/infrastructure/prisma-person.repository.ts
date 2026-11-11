import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConflictError } from '../../../shared/domain/errors';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { Person } from '../domain/person.entity';
import { PersonDetail, PersonRepository, PersonSummary } from '../domain/person.repository';
import { toDomain, toPersistence } from './person.mapper';

@Injectable()
export class PrismaPersonRepository implements PersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityId): Promise<Person | null> {
    const row = await this.prisma.person.findUnique({ where: { id: id.value } });
    return row ? toDomain(row) : null;
  }

  async findByNameKey(key: string): Promise<Person | null> {
    const row = await this.prisma.person.findUnique({ where: { nameKey: key } });
    return row ? toDomain(row) : null;
  }

  async save(person: Person): Promise<void> {
    const { id, ...data } = toPersistence(person);
    try {
      await this.prisma.person.upsert({ where: { id }, create: { id, ...data }, update: data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictError(`Já existe uma pessoa chamada "${person.name.value}"`);
      }
      throw e;
    }
  }

  async delete(id: UniqueEntityId): Promise<boolean> {
    try {
      const { count } = await this.prisma.person.deleteMany({ where: { id: id.value } });
      return count > 0;
    } catch (e) {
      // Vínculo criado entre a checagem e o delete: FK Restrict (P2003) vira 409.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictError('Não é possível excluir uma pessoa que participa de algum rolê');
      }
      throw e;
    }
  }

  async countMemberships(id: UniqueEntityId): Promise<number> {
    return this.prisma.groupMember.count({ where: { personId: id.value } });
  }

  async count(): Promise<number> {
    return this.prisma.person.count();
  }

  async listSummaries(): Promise<PersonSummary[]> {
    const rows = await this.prisma.person.findMany({
      include: { _count: { select: { memberships: true } } },
    });
    return rows.map((r) => ({ person: toDomain(r), groupCount: r._count.memberships }));
  }

  async getDetail(id: UniqueEntityId): Promise<PersonDetail | null> {
    const row = await this.prisma.person.findUnique({
      where: { id: id.value },
      include: {
        memberships: {
          include: {
            group: { include: { _count: { select: { members: true } } } },
          },
        },
      },
    });
    if (!row) return null;
    const groupIds = row.memberships.map((m) => m.groupId);
    const totals = await this.prisma.expense.groupBy({
      by: ['groupId'],
      where: { groupId: { in: groupIds } },
      _sum: { amountCents: true },
    });
    const totalBy = new Map(totals.map((t) => [t.groupId, t._sum.amountCents ?? 0]));
    return {
      person: toDomain(row),
      groups: row.memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        createdAt: m.group.createdAt,
        memberCount: m.group._count.members,
        totalCents: totalBy.get(m.group.id) ?? 0,
      })),
    };
  }
}
