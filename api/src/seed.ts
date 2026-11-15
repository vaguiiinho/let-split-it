import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CreateUserUseCase } from './modules/users/application/use-cases/create-user.use-case';
import { USER_REPOSITORY, UserRepository } from './modules/users/domain/user.repository';
import { Username } from './modules/users/domain/value-objects/username.vo';
import { loadEnvFileIfPresent } from './shared/infrastructure/load-env';

const DEMO_USERS = [
  { username: 'huguinho', password: 'huguinho123', name: 'Huguinho' },
  { username: 'luizinho', password: 'luizinho123', name: 'Luizinho' },
  { username: 'zezinho', password: 'zezinho123', name: 'Zezinho' },
];

/** Seed idempotente: cria o que falta e nunca altera senha/papel de quem já existe (DM1: só corrige isDemo). */
async function seed(): Promise<void> {
  loadEnvFileIfPresent();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const users = app.get<UserRepository>(USER_REPOSITORY, { strict: false });
    const createUser = app.get(CreateUserUseCase, { strict: false });

    for (const demo of DEMO_USERS) {
      const existing = await users.findByUsername(Username.create(demo.username));
      if (existing) {
        if (!existing.isDemo) await users.save(existing.withDemo(true));
        console.log(`seed: ${demo.username} já existe`);
        continue;
      }
      await createUser.execute({ ...demo, role: 'USER', isDemo: true });
      console.log(`seed: criado ${demo.username}`);
    }

    const admin = await users.findByUsername(Username.create('admin'));
    if (admin) {
      console.log('seed: admin já existe');
    } else {
      const adminPassword =
        process.env.ADMIN_PASSWORD ||
        (process.env.NODE_ENV === 'production' ? undefined : 'admin123');
      if (!adminPassword) {
        console.warn('seed: ADMIN_PASSWORD não definida: admin não criado');
      } else {
        await createUser.execute({
          username: 'admin',
          password: adminPassword,
          name: 'Administrador',
          role: 'ADMIN',
        });
        console.log('seed: criado admin');
      }
    }
  } finally {
    await app.close();
  }
}

seed().then(
  () => process.exit(0),
  (e: unknown) => {
    console.error('seed: falhou', e);
    process.exit(1);
  },
);
