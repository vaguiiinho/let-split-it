import { Global, Module } from '@nestjs/common';
import { Clock, CLOCK } from '../domain/clock.port';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, { provide: CLOCK, useValue: { now: () => new Date() } satisfies Clock }],
  exports: [PrismaService, CLOCK],
})
export class SharedModule {}
