import { PurgeDemoDataUseCase } from '../application/use-cases/purge-demo-data.use-case';
import { DemoPurgeScheduler, parsePurgeIntervalHours } from './demo-purge.scheduler';

describe('parsePurgeIntervalHours', () => {
  it('inteiro > 0 liga; vazio, 0 e inválido desligam', () => {
    expect(parsePurgeIntervalHours('24')).toBe(24);
    expect(parsePurgeIntervalHours(undefined)).toBeNull();
    expect(parsePurgeIntervalHours('')).toBeNull();
    expect(parsePurgeIntervalHours('0')).toBeNull();
    expect(parsePurgeIntervalHours('-1')).toBeNull();
    expect(parsePurgeIntervalHours('1.5')).toBeNull();
    expect(parsePurgeIntervalHours('abc')).toBeNull();
  });
});

describe('DemoPurgeScheduler', () => {
  afterEach(() => jest.useRealTimers());

  it('executa no intervalo e um erro não propaga', async () => {
    jest.useFakeTimers();
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ groups: 1, invites: 0, people: 0 })
      .mockRejectedValueOnce(new Error('db'));
    const sch = new DemoPurgeScheduler({ execute } as unknown as PurgeDemoDataUseCase, 1);
    jest.spyOn(sch['logger'], 'log').mockImplementation();
    jest.spyOn(sch['logger'], 'error').mockImplementation();
    sch.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(3_600_000);
    await jest.advanceTimersByTimeAsync(3_600_000);
    expect(execute).toHaveBeenCalledTimes(2);
    sch.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(3_600_000);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('desligado não agenda', async () => {
    jest.useFakeTimers();
    const execute = jest.fn();
    const sch = new DemoPurgeScheduler({ execute } as unknown as PurgeDemoDataUseCase, null);
    sch.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(10 * 3_600_000);
    expect(execute).not.toHaveBeenCalled();
  });
});
