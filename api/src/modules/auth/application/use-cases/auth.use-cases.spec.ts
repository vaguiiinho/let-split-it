import {
  FakeHasher,
  HmacJwtTokenService,
  makeUser,
  makeUserRepo,
} from '../../../users/testing/fixtures';
import { AuthenticateTokenUseCase } from './authenticate-token.use-case';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { LoginUseCase } from './login.use-case';
import {
  InMemoryGroupInviteRepository,
  InMemoryGroupRepository,
} from '../../../groups/testing/fixtures';

const clock = { now: () => new Date('2026-01-01T00:00:00Z') };

async function setup() {
  const repos = makeUserRepo();
  const hasher = new FakeHasher();
  const tokens = new HmacJwtTokenService('s'.repeat(40), clock);
  const ana = await makeUser(repos, 'ana', { password: 'senha1234' });
  return {
    ...repos,
    hasher,
    tokens,
    ana,
    login: new LoginUseCase(repos.users, hasher, tokens),
    authenticate: new AuthenticateTokenUseCase(tokens, repos.users),
  };
}

describe('LoginUseCase', () => {
  it('sucesso devolve token e UserOutput (username normalizado)', async () => {
    const { login, tokens, ana } = await setup();
    const out = await login.execute({ username: '  ANA ', password: 'senha1234' });
    expect(out.user).toMatchObject({ username: 'ana', role: 'USER' });
    expect(tokens.verify(out.accessToken).sub).toBe(ana.actor.userId);
  });

  it('inexistente, senha errada e username inválido → mesmo 401 e o hasher sempre é chamado', async () => {
    const { login, hasher } = await setup();
    for (const input of [
      { username: 'ninguem', password: 'senha1234' },
      { username: 'ana', password: 'errada' },
      { username: '@@', password: 'senha1234' },
    ]) {
      const before = hasher.calls.verify;
      await expect(login.execute(input)).rejects.toMatchObject({
        kind: 'unauthorized',
        message: 'Usuário ou senha inválidos',
      });
      expect(hasher.calls.verify).toBe(before + 1);
    }
  });
});

describe('AuthenticateTokenUseCase', () => {
  it('header ausente ou sem Bearer → Não autenticado', async () => {
    const { authenticate } = await setup();
    await expect(authenticate.execute({})).rejects.toMatchObject({ kind: 'unauthorized', message: 'Não autenticado' });
    await expect(authenticate.execute({ authorization: 'Basic x' })).rejects.toMatchObject({ message: 'Não autenticado' });
    await expect(authenticate.execute({ authorization: 'Bearer ' })).rejects.toMatchObject({ message: 'Não autenticado' });
  });

  it('token inválido, sub inválido ou de usuário apagado → Sessão expirada ou inválida', async () => {
    const { authenticate, tokens } = await setup();
    await expect(authenticate.execute({ authorization: 'Bearer lixo' })).rejects.toMatchObject({
      message: 'Sessão expirada ou inválida',
    });
    const ghost = tokens.sign({ sub: '11111111-1111-4111-8111-111111111111', role: 'ADMIN' });
    await expect(authenticate.execute({ authorization: `Bearer ${ghost}` })).rejects.toMatchObject({
      message: 'Sessão expirada ou inválida',
    });
    const bad = tokens.sign({ sub: 'nao-uuid', role: 'ADMIN' });
    await expect(authenticate.execute({ authorization: `Bearer ${bad}` })).rejects.toMatchObject({
      message: 'Sessão expirada ou inválida',
    });
  });

  it('token válido → Actor com o papel do banco (D6)', async () => {
    const { authenticate, tokens, ana } = await setup();
    const forgedRole = tokens.sign({ sub: ana.actor.userId, role: 'ADMIN' });
    expect(await authenticate.execute({ authorization: `Bearer ${forgedRole}` })).toEqual(ana.actor);
  });
});

describe('GetCurrentUserUseCase', () => {
  it('devolve o usuário com pendingInviteCount; usuário sumido → 401', async () => {
    const repos = makeUserRepo();
    const ana = await makeUser(repos, 'ana');
    const invites = new InMemoryGroupInviteRepository(repos.users, new InMemoryGroupRepository());
    const uc = new GetCurrentUserUseCase(repos.users, invites);
    expect(await uc.execute({ actor: ana.actor })).toMatchObject({ username: 'ana', pendingInviteCount: 0 });
    await expect(
      uc.execute({ actor: { ...ana.actor, userId: '11111111-1111-4111-8111-111111111111' } }),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });
});
