import { Controller, Get } from '@nestjs/common';
import { Public } from './auth.decorators';

/** Liveness usado pelo healthcheck do container (healthcheck.js). */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
