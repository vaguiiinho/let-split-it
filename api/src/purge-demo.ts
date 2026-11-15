import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PurgeDemoDataUseCase } from './modules/users/application/use-cases/purge-demo-data.use-case';
import { loadEnvFileIfPresent } from './shared/infrastructure/load-env';

/** Limpeza manual dos dados de demonstração (`npm run demo:purge`). */
async function run(): Promise<void> {
  loadEnvFileIfPresent();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const out = await app.get(PurgeDemoDataUseCase, { strict: false }).execute({});
    console.log(
      `demo:purge: ${out.groups} rolês, ${out.invites} convites, ${out.people} pessoas removidos`,
    );
  } finally {
    await app.close();
  }
}

run().then(
  () => process.exit(0),
  (e: unknown) => {
    console.error('demo:purge: falhou', e);
    process.exit(1);
  },
);
