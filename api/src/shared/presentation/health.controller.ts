import { Controller, Get } from '@nestjs/common';

/** Liveness usado pelo healthcheck do container (healthcheck.js). */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
