import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConflictError } from '../../../shared/domain/errors';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { User } from '../domain/user.entity';
import { UserRepository, UserWithName } from '../domain/user.repository';
import { Username } from '../domain/value-objects/username.vo';
import { toDomain, toPersistence } from './user.mapper';

const withPerson = { person: { select: { name: true } } } satisfies Prisma.UserInclude;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityId): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id: id.value } });
    return row ? toDomain(row) : null;
  }

  async findWithNameById(id: UniqueEntityId): Promise<UserWithName | null> {
    const row = await this.prisma.user.findUnique({ where: { id: id.value }, include: withPerson });
    return row ? { user: toDomain(row), name: row.person.name } : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { username: username.value } });
    return row ? toDomain(row) : null;
  }

  async findByPersonId(personId: UniqueEntityId): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { personId: personId.value } });
    return row ? toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    const { id, ...data } = toPersistence(user);
    try {
      await this.prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictError(`Já existe um usuário "${user.username.value}"`);
      }
      throw e;
    }
  }

  async list(): Promise<UserWithName[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { username: 'asc' },
      include: withPerson,
    });
    return rows.map((r) => ({ user: toDomain(r), name: r.person.name }));
  }

  async search(q: string, excludeId: UniqueEntityId, limit: number): Promise<UserWithName[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        id: { not: excludeId.value },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { person: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      orderBy: { username: 'asc' },
      take: limit,
      include: withPerson,
    });
    return rows.map((r) => ({ user: toDomain(r), name: r.person.name }));
  }
}
