import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './shared/presentation/all-exceptions.filter';

/** Configuração compartilhada entre main.ts e testes e2e. */
export function configureApp(app: INestApplication): INestApplication {
  app.enableCors({ origin: ['http://localhost:3000'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
