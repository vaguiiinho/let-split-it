import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  process.env.DATABASE_URL ??= 'file:./dev.db';
  const app = configureApp(await NestFactory.create(AppModule));
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port);
  console.log(`Racha Aí API ouvindo em http://localhost:${port}`);
}

void bootstrap();
