import { Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { PurgeDemoDataUseCase } from '../application/use-cases/purge-demo-data.use-case';

/** Interpreta DEMO_PURGE_INTERVAL_HOURS: inteiro > 0 liga; vazio/0/inválido desliga. */
export function parsePurgeIntervalHours(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Agenda a limpeza dos dados de demonstração dentro do processo (setInterval com unref). */
export class DemoPurgeScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DemoPurgeScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly purge: PurgeDemoDataUseCase,
    private readonly intervalHours: number | null,
  ) {}

  onApplicationBootstrap(): void {
    if (this.intervalHours === null) return;
    this.timer = setInterval(() => void this.run(), this.intervalHours * 3_600_000);
    this.timer.unref();
    this.logger.log(`Limpeza de dados demo agendada a cada ${this.intervalHours}h`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async run(): Promise<void> {
    try {
      const r = await this.purge.execute({});
      this.logger.log(
        `Limpeza demo: ${r.groups} rolês, ${r.invites} convites, ${r.people} pessoas removidos`,
      );
    } catch (e) {
      this.logger.error('Falha na limpeza de dados demo', e as Error);
    }
  }
}
