import { PurgeDemoDataUseCase } from './purge-demo-data.use-case';

describe('PurgeDemoDataUseCase', () => {
  it('delega ao purger e devolve as contagens', async () => {
    const purge = jest.fn().mockResolvedValue({ groups: 2, invites: 1, people: 3 });
    const out = await new PurgeDemoDataUseCase({ purge }).execute({});
    expect(out).toEqual({ groups: 2, invites: 1, people: 3 });
    expect(purge).toHaveBeenCalledTimes(1);
  });
});
