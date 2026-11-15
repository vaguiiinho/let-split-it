import { Injectable } from '@nestjs/common';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { GroupInvite } from '../domain/entities/group-invite.entity';
import {
  GroupInviteRepository,
  GroupInviteView,
  PendingInviteView,
} from '../domain/group-invite.repository';
import { toDomain, toPersistence } from './group-invite.mapper';

const userSelect = { select: { id: true, username: true, person: { select: { name: true } } } };

@Injectable()
export class PrismaGroupInviteRepository implements GroupInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityId): Promise<GroupInvite | null> {
    const row = await this.prisma.groupInvite.findUnique({ where: { id: id.value } });
    return row ? toDomain(row) : null;
  }

  async findPending(groupId: UniqueEntityId, inviteeId: UniqueEntityId): Promise<GroupInvite | null> {
    const row = await this.prisma.groupInvite.findFirst({
      where: { groupId: groupId.value, inviteeId: inviteeId.value, status: 'PENDING' },
    });
    return row ? toDomain(row) : null;
  }

  async listPendingForInvitee(inviteeId: UniqueEntityId): Promise<PendingInviteView[]> {
    const rows = await this.prisma.groupInvite.findMany({
      where: { inviteeId: inviteeId.value, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { group: { select: { id: true, name: true } }, inviter: userSelect },
    });
    return rows.map((r) => ({
      id: r.id,
      group: r.group,
      inviter: { id: r.inviter.id, username: r.inviter.username, name: r.inviter.person.name },
      createdAt: r.createdAt,
    }));
  }

  async listPendingForGroup(groupId: UniqueEntityId): Promise<GroupInviteView[]> {
    const rows = await this.prisma.groupInvite.findMany({
      where: { groupId: groupId.value, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { invitee: userSelect },
    });
    return rows.map((r) => ({
      invite: toDomain(r),
      invitee: { id: r.invitee.id, username: r.invitee.username, name: r.invitee.person.name },
    }));
  }

  async countPendingForInvitee(inviteeId: UniqueEntityId): Promise<number> {
    return this.prisma.groupInvite.count({
      where: { inviteeId: inviteeId.value, status: 'PENDING' },
    });
  }

  async save(invite: GroupInvite): Promise<void> {
    const { id, ...data } = toPersistence(invite);
    await this.prisma.groupInvite.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
}
