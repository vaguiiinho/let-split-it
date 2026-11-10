import { Injectable } from '@nestjs/common';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { Group } from '../domain/group.aggregate';
import { GroupRepository, GroupSummary } from '../domain/group.repository';
import { groupInclude, toDomain, toPersistence } from './group.mapper';

@Injectable()
export class PrismaGroupRepository implements GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityId): Promise<Group | null> {
    const row = await this.prisma.group.findUnique({
      where: { id: id.value },
      include: groupInclude,
    });
    return row ? toDomain(row) : null;
  }

  async listSummaries(): Promise<GroupSummary[]> {
    const [groups, totals] = await Promise.all([
      this.prisma.group.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true, expenses: true } } },
      }),
      this.prisma.expense.groupBy({ by: ['groupId'], _sum: { amountCents: true } }),
    ]);
    const totalBy = new Map(totals.map((t) => [t.groupId, t._sum.amountCents ?? 0]));
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      createdAt: g.createdAt,
      memberCount: g._count.members,
      expenseCount: g._count.expenses,
      totalCents: totalBy.get(g.id) ?? 0,
    }));
  }

  /** Persiste o aggregate inteiro (substitui filhos) numa transação. */
  async save(group: Group): Promise<void> {
    const data = toPersistence(group);
    await this.prisma.$transaction(async (tx) => {
      await tx.group.upsert({
        where: { id: data.group.id },
        create: data.group,
        update: { name: data.group.name },
      });
      await tx.payment.deleteMany({ where: { groupId: data.group.id } });
      await tx.expense.deleteMany({ where: { groupId: data.group.id } });
      await tx.member.deleteMany({ where: { groupId: data.group.id } });
      if (data.members.length) await tx.member.createMany({ data: data.members });
      for (const { participants, ...expense } of data.expenses) {
        await tx.expense.create({ data: { ...expense, participants: { create: participants } } });
      }
      if (data.payments.length) await tx.payment.createMany({ data: data.payments });
    });
  }

  async delete(id: UniqueEntityId): Promise<boolean> {
    const { count } = await this.prisma.group.deleteMany({ where: { id: id.value } });
    return count > 0;
  }
}
