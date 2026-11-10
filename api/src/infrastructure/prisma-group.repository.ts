import { Injectable } from '@nestjs/common';
import { Group } from '../domain/group';
import { GroupRepository, GroupSummary } from '../application/ports';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaGroupRepository implements GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Group | null> {
    const row = await this.prisma.group.findUnique({
      where: { id },
      include: {
        members: { orderBy: { position: 'asc' } },
        expenses: {
          orderBy: { position: 'asc' },
          include: { participants: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!row) return null;
    return Group.restore({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      members: row.members.map((m) => ({ id: m.id, name: m.name, pixKey: m.pixKey })),
      expenses: row.expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amountCents: e.amountCents,
        payerId: e.payerId,
        createdAt: e.createdAt,
        participants: e.participants.map((p) => ({ memberId: p.memberId, weight: p.weight })),
      })),
    });
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
    await this.prisma.$transaction(async (tx) => {
      await tx.group.upsert({
        where: { id: group.id },
        create: { id: group.id, name: group.name, createdAt: group.createdAt },
        update: { name: group.name },
      });
      await tx.expense.deleteMany({ where: { groupId: group.id } });
      await tx.member.deleteMany({ where: { groupId: group.id } });
      if (group.members.length) {
        await tx.member.createMany({
          data: group.members.map((m, position) => ({
            id: m.id,
            groupId: group.id,
            name: m.name,
            pixKey: m.pixKey,
            position,
          })),
        });
      }
      for (const [position, e] of group.expenses.entries()) {
        await tx.expense.create({
          data: {
            id: e.id,
            groupId: group.id,
            description: e.description,
            amountCents: e.amountCents,
            payerId: e.payerId,
            createdAt: e.createdAt,
            position,
            participants: {
              create: e.participants.map((p, pos) => ({
                memberId: p.memberId,
                weight: p.weight,
                position: pos,
              })),
            },
          },
        });
      }
    });
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.group.deleteMany({ where: { id } });
    return count > 0;
  }
}
