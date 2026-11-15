import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';
import { Password } from '../src/modules/users/domain/value-objects/password.vo';
import { ScryptPasswordHasher } from '../src/modules/users/infrastructure/scrypt-password-hasher';

type Http = ReturnType<typeof request>;
const hasher = new ScryptPasswordHasher();

/** Cria Person + User direto no banco (sem passar pela API). Retorna os ids. */
export async function createUser(
  prisma: PrismaService,
  input: { username: string; password?: string; role?: 'USER' | 'ADMIN'; name?: string; isDemo?: boolean },
): Promise<{ userId: string; personId: string }> {
  const { randomUUID } = await import('node:crypto');
  const name = input.name ?? input.username;
  const password = Password.create(input.password ?? 'senha1234').value;
  const person = await prisma.person.create({
    data: { id: randomUUID(), name, nameKey: name.toLocaleLowerCase('pt-BR'), createdAt: new Date() },
  });
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      username: input.username.toLowerCase(),
      passwordHash: await hasher.hash(password),
      role: input.role ?? 'USER',
      isDemo: input.isDemo ?? false,
      personId: person.id,
      createdAt: new Date(),
    },
  });
  return { userId: user.id, personId: person.id };
}

export async function login(http: Http, username: string, password = 'senha1234'): Promise<string> {
  const res = await http.post('/auth/login').send({ username, password }).expect(200);
  return (res.body as { accessToken: string }).accessToken;
}

/** Cliente HTTP que envia `Authorization: Bearer <token>` em todas as chamadas. */
export function asUser(http: Http, token: string) {
  const auth = (t: request.Test) => t.set('Authorization', `Bearer ${token}`);
  return {
    get: (url: string) => auth(http.get(url)),
    post: (url: string) => auth(http.post(url)),
    patch: (url: string) => auth(http.patch(url)),
    delete: (url: string) => auth(http.delete(url)),
  };
}
